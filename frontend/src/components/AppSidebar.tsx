import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Settings, ChevronDown, Home, LogOut, Plus, User2 } from "lucide-react";

export default function AppSidebar() {
  const {
    state,
    open,
    setOpen,
    isMobile,
    toggleSidebar,
  } = useSidebar();

  return (
      <Sidebar className="" dir="ltr" collapsible="icon" variant="inset">

        {/* Sidebar Header */}
        <SidebarHeader className="">
            <SidebarMenu className="">
                <SidebarMenuItem className="">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton asChild isActive className="" tooltip={"hello"}>
                                Select Workspace
                                <ChevronDown className="ml-auto" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
                            <DropdownMenuItem className="" inset={false}>
                                <span>Acme Inc</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>

        {/* Sidebar Content */}
        <SidebarContent className="">
          <SidebarGroup className="">
            <SidebarGroupLabel className="">Application</SidebarGroupLabel>
            <SidebarGroupAction className="">
                <Plus /> <span className="sr-only">Add Project</span>
            </SidebarGroupAction>
            <SidebarGroupContent className=""></SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="" />
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarFooter className="">
            <SidebarMenu className="">
                <SidebarMenuItem className="">
                    <SidebarMenuButton tooltip={null} className="">
                      <User2 /> Username
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem className="">
                    <SidebarMenuButton tooltip={null} className="" asChild isActive>
                        <a href="#">
                        <Home />
                        <span>Home</span>
                        </a>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="ml-auto">24</SidebarMenuBadge>
                    <SidebarMenuAction className="ml-auto">
                        <Plus /> <span className="sr-only">Add Project</span>
                    </SidebarMenuAction>
                </SidebarMenuItem>

                <SidebarMenuItem className="">
                    <SidebarMenuButton tooltip={null} className="" asChild>
                    <button onClick={() => console.log('Cerrar sesión')}>
                        <LogOut className="h-4 w-4" />
                        <span>Cerrar sesión</span>
                    </button>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
  );
}