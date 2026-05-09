import {
  Sidebar,
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
} from "@/components/ui/dropdown-menu";
import { Settings, ChevronDown, Home, LogOut, Plus, User2 } from "lucide-react";
import Explorer from "./Explorer";


export default function AppSidebar({
  history,
  snippets,
  activeHistoryId,
  onOpenSnippet,
  onSelectHistory
}) {
  const { open } = useSidebar();
  
  
  return (
      <Sidebar className="pt-10 pb-5" dir="ltr" collapsible="icon" variant="inset">

        {/* Sidebar Header */}
        <SidebarHeader className="flex flex-row items-center justify-between p-1">
            <SidebarMenu className="">
                <SidebarMenuItem className="">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center gap-2 px-2 py-1">
                                <span className="text-xs text-muted-foreground">Select Workspace</span>
                                <ChevronDown className="ml-auto h-2 w-2" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-2">
                              {/* tamanio del boton  */}
                            <DropdownMenuItem className="" inset={false}>
                                <span className="text-xs">Initial Work</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>

        {/* Sidebar Content */}
        <SidebarContent className="p-1">
          <SidebarGroup className="">
            <Explorer
                history={history}
                snippets={snippets}
                activeHistoryId={activeHistoryId}
                onOpenSnippet={onOpenSnippet}
                onSelectHistory={onSelectHistory}
            />
          </SidebarGroup>
          {/* <SidebarGroup className="">
            <SidebarGroupLabel className="">Application</SidebarGroupLabel>
            <SidebarGroupAction className="">
                <Plus /> <span className="sr-only">Add Project</span>
            </SidebarGroupAction>
            <SidebarGroupContent className=""></SidebarGroupContent>
          </SidebarGroup> */}

          <SidebarGroup className="" />
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarFooter className="p-1">
            <SidebarMenu className="">
                <SidebarMenuItem className="">
                    <SidebarMenuButton tooltip={null} className="">
                      <User2 /> User
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem className="">
                    <SidebarMenuButton tooltip={null} className="" asChild>
                        <a href="#">
                        <Settings />
                        <span>Settings</span>
                        </a>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem className="">
                    <SidebarMenuButton tooltip={null} className="" asChild isActive>
                        <a href="#">
                        <Home />
                        <span>Home</span>
                        </a>
                    </SidebarMenuButton>
                    {/* <SidebarMenuBadge className="ml-auto">24</SidebarMenuBadge> */}
                    <SidebarMenuAction className="ml-auto">
                        <Plus /> <span className="sr-only">Add Project</span>
                    </SidebarMenuAction>
                </SidebarMenuItem>

                <SidebarMenuItem className="">
                    <SidebarMenuButton tooltip={null} className="" asChild>
                    <button onClick={() => console.log('Cerrar sesión')}>
                        <LogOut className="w-4" />
                        <span>Logout</span>
                    </button>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
  );
}
