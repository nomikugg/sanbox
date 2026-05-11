use crate::runner::RuntimeError;
use swc_common::{comments::SingleThreadedComments, sync::Lrc, FileName, Globals, Mark, SourceMap, GLOBALS};
use swc_ecma_ast::EsVersion;
use swc_ecma_codegen::to_code_default;
use swc_ecma_parser::{lexer::Lexer, EsSyntax, Parser, StringInput, Syntax, TsSyntax};
use swc_ecma_transforms_base::{fixer::fixer, hygiene::hygiene, resolver};
use swc_ecma_transforms_react::react;
use swc_ecma_transforms_typescript::strip;

#[derive(Debug, Clone, Copy)]
pub enum SourceLanguage {
  Js,
  Jsx,
  Ts,
  Tsx,
  Ty,
}

impl SourceLanguage {
  pub fn from_str(value: &str) -> Self {
    match value {
      "jsx" => Self::Jsx,
      "ts" => Self::Ts,
      "tsx" => Self::Tsx,
      "ty" => Self::Ty,
      _ => Self::Js,
    }
  }

  fn is_typescript(self) -> bool {
    matches!(self, Self::Ts | Self::Tsx | Self::Ty)
  }

  fn is_jsx(self) -> bool {
    matches!(self, Self::Jsx | Self::Tsx)
  }

  fn filename(self) -> &'static str {
    match self {
      Self::Js => "snippet.js",
      Self::Jsx => "snippet.jsx",
      Self::Ts => "snippet.ts",
      Self::Tsx => "snippet.tsx",
      Self::Ty => "snippet.ty",
    }
  }
}

pub struct TranspiledSource {
  pub code: String,
  pub source_map: Option<String>,
}

pub fn transpile_source(source: &str, language: SourceLanguage) -> Result<TranspiledSource, RuntimeError> {
  if matches!(language, SourceLanguage::Js) {
    return Ok(TranspiledSource {
      code: source.to_string(),
      source_map: None,
    });
  }

  let cm: Lrc<SourceMap> = Default::default();
  let comments = SingleThreadedComments::default();
  let fm = cm.new_source_file(FileName::Custom(language.filename().into()).into(), source.to_string());
  let syntax = if language.is_typescript() {
    Syntax::Typescript(TsSyntax {
      tsx: language.is_jsx(),
      ..Default::default()
    })
  } else {
    Syntax::Es(EsSyntax {
      jsx: language.is_jsx(),
      ..Default::default()
    })
  };

  let lexer = Lexer::new(syntax, EsVersion::Es2022, StringInput::from(&*fm), Some(&comments));
  let mut parser = Parser::new_from(lexer);
  for error in parser.take_errors() {
    return Err(RuntimeError::Process(format!("SWC parse error: {error:?}")));
  }

  let program = parser
    .parse_program()
    .map_err(|error| RuntimeError::Process(format!("SWC parse error: {error:?}")))?;

  let mut code = GLOBALS.set(&Globals::default(), || {
    let unresolved_mark = Mark::new();
    let top_level_mark = Mark::new();

    let mut program = program.apply(resolver(unresolved_mark, top_level_mark, true));

    if language.is_typescript() {
      program = program.apply(strip(unresolved_mark, top_level_mark));
    }

    if language.is_jsx() {
      program = program.apply(react(
        cm.clone(),
        Some(comments.clone()),
        Default::default(),
        top_level_mark,
        unresolved_mark,
      ));
    }

    program = program.apply(hygiene());
    program = program.apply(fixer(Some(&comments)));

    to_code_default(cm.clone(), Some(&comments), &program)
  });

  code.push_str(&format!("\n//# sourceURL={}", language.filename()));

  Ok(TranspiledSource {
    code,
    source_map: None,
  })
}
