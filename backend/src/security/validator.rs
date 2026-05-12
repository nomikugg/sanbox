use crate::runner::RuntimeKind;
use crate::security::{PermissionPolicy, SecurityMode};
use swc_common::{sync::Lrc, FileName, SourceMap};
use swc_ecma_ast::{
  Callee, EsVersion, Expr, ExprOrSpread, Lit, MemberProp, NewExpr, Program,
};
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax, TsSyntax};
use swc_ecma_visit::{Visit, VisitWith};

// ─── Public entry point ──────────────────────────────────────────────────────

pub fn validate_source(
  source: &str,
  runtime: RuntimeKind,
  mode: SecurityMode,
  permissions: &PermissionPolicy,
) -> Result<(), Vec<String>> {
  if matches!(runtime, RuntimeKind::Bun) {
    return Err(vec!["Bun runtime is scaffolded but not enabled in the production build".into()]);
  }

  // Parse with TypeScript + JSX superset so any dialect works.
  // If parsing fails we let the runtime report the syntax error — we don't block here.
  let program = match parse_any(source) {
    Ok(p) => p,
    Err(_) => return Ok(()),
  };

  let mut visitor = SecurityVisitor::new(mode, permissions);
  program.visit_with(&mut visitor);

  if visitor.violations.is_empty() {
    Ok(())
  } else {
    Err(visitor.violations)
  }
}

// ─── Parser ──────────────────────────────────────────────────────────────────

fn parse_any(source: &str) -> Result<Program, ()> {
  let cm: Lrc<SourceMap> = Default::default();
  let fm = cm.new_source_file(
    FileName::Custom("input.ts".into()).into(),
    source.to_string(),
  );

  let lexer = Lexer::new(
    Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
    EsVersion::Es2022,
    StringInput::from(&*fm),
    None,
  );
  let mut parser = Parser::new_from(lexer);
  parser.parse_program().map_err(|_| ())
}

// ─── Visitor ─────────────────────────────────────────────────────────────────

struct SecurityVisitor<'a> {
  violations: Vec<String>,
  mode: SecurityMode,
  permissions: &'a PermissionPolicy,
}

impl<'a> SecurityVisitor<'a> {
  fn new(mode: SecurityMode, permissions: &'a PermissionPolicy) -> Self {
    Self { violations: Vec::new(), mode, permissions }
  }

  fn deny(&mut self, msg: impl Into<String>) {
    let msg = msg.into();
    // Deduplicate at push time so chained member expressions (e.g. Deno.env.get())
    // don't produce the same violation from both the outer and inner visit passes.
    if !self.violations.contains(&msg) {
      self.violations.push(msg);
    }
  }

  fn is_ident(expr: &Expr, name: &str) -> bool {
    matches!(expr, Expr::Ident(i) if i.sym.as_str() == name)
  }

  fn is_member_call(expr: &Expr, obj: &str, prop: &str) -> bool {
    if let Expr::Member(m) = expr {
      if let MemberProp::Ident(p) = &m.prop {
        return Self::is_ident(&m.obj, obj) && p.sym.as_str() == prop;
      }
    }
    false
  }

  fn check_call_callee(&mut self, callee_expr: &Expr, args: &[ExprOrSpread]) {
    // ── Ident-based calls: require(), eval(), Function(), fetch() ────────────
    if let Expr::Ident(ident) = callee_expr {
      match ident.sym.as_str() {
        "require" => self.check_require(args),
        "eval" if matches!(self.mode, SecurityMode::Strict) => {
          self.deny("strict mode: eval() is blocked");
        }
        "Function" if matches!(self.mode, SecurityMode::Strict) => {
          self.deny("strict mode: Function() constructor is blocked");
        }
        "fetch" if !self.permissions.network => {
          self.deny("fetch() network access is blocked by security policy");
        }
        _ => {}
      }
      return;
    }

    // ── Member-expression calls: Deno.run(), Bun.spawn(), Deno.readFile(), … ─
    if let Expr::Member(member) = callee_expr {
      if let (MemberProp::Ident(prop), Expr::Ident(obj)) =
        (&member.prop, member.obj.as_ref())
      {
        let obj_name = obj.sym.as_str();
        let prop_name = prop.sym.as_str();

        match (obj_name, prop_name) {
          ("Deno", "run") | ("Deno", "command")
            if matches!(self.mode, SecurityMode::Strict) =>
          {
            self.deny(format!("strict mode: Deno.{prop_name}() is blocked"));
          }
          ("Bun", "spawn") if matches!(self.mode, SecurityMode::Strict) => {
            self.deny("strict mode: Bun.spawn() is blocked");
          }
          ("Deno", op) if !self.permissions.filesystem => {
            const FS_OPS: &[&str] = &[
              "readFile",
              "writeFile",
              "readTextFile",
              "writeTextFile",
              "remove",
              "mkdir",
              "copyFile",
              "symlink",
              "chmod",
              "chown",
              "open",
              "stat",
              "lstat",
              "readDir",
              "makeTempFile",
              "makeTempDir",
            ];
            if FS_OPS.contains(&op) {
              self.deny(format!("Deno.{op}() filesystem access is blocked by security policy"));
            }
          }
          _ => {}
        }
      }
    }
  }

  fn check_require(&mut self, args: &[ExprOrSpread]) {
    // Wtf8Atom derefs to Wtf8, which has as_str() -> Option<&str>.
    // JS string literals are always valid UTF-8, so unwrap_or_default is safe.
    let module = match args.first() {
      Some(ExprOrSpread { expr, .. }) => match expr.as_ref() {
        Expr::Lit(Lit::Str(s)) => s.value.as_str().unwrap_or_default().to_owned(),
        _ => return,
      },
      None => return,
    };

    match module.as_str() {
      "child_process" if !self.permissions.child_process => {
        self.deny("require('child_process') is blocked by security policy");
      }
      "fs" | "fs/promises" | "fs-extra" if !self.permissions.filesystem => {
        self.deny(format!("require('{module}') filesystem access is blocked"));
      }
      "net" | "http" | "https" | "dgram" | "tls" | "http2" if !self.permissions.network => {
        self.deny(format!("require('{module}') network access is blocked"));
      }
      _ => {}
    }
  }
}

impl<'a> Visit for SecurityVisitor<'a> {
  fn visit_call_expr(&mut self, node: &swc_ecma_ast::CallExpr) {
    // Dynamic import() — blocked in strict mode
    if matches!(self.mode, SecurityMode::Strict) {
      if let Callee::Import(_) = &node.callee {
        self.deny("strict mode: dynamic import() is blocked");
      }
    }

    if let Callee::Expr(callee_box) = &node.callee {
      self.check_call_callee(callee_box, &node.args);
    }

    node.visit_children_with(self);
  }

  fn visit_new_expr(&mut self, node: &NewExpr) {
    // new WebSocket(...)
    if !self.permissions.network && Self::is_ident(&node.callee, "WebSocket") {
      self.deny("WebSocket network access is blocked by security policy");
    }
    node.visit_children_with(self);
  }

  fn visit_member_expr(&mut self, node: &swc_ecma_ast::MemberExpr) {
    if let MemberProp::Ident(prop) = &node.prop {
      let prop_name = prop.sym.as_str();

      if prop_name == "env" && !self.permissions.environment {
        if Self::is_ident(&node.obj, "process") {
          self.deny("process.env access is blocked by security policy");
        }
        if Self::is_ident(&node.obj, "Deno") {
          self.deny("Deno.env access is blocked by security policy");
        }
      }

      // Catch Deno.env.get(), Deno.env.set(), etc. via chained member
      if !self.permissions.environment
        && Self::is_member_call(&node.obj, "Deno", "env")
      {
        self.deny("Deno.env access is blocked by security policy");
      }
    }

    node.visit_children_with(self);
  }
}
