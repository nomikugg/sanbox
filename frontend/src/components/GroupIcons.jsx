import {
  SquareIcon,
  PlayIcon,
  PauseIcon,
  BugIcon,
} from "lucide-react"

import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export default function GroupIcons({
  onDebug, 
  onExecute, 
  onStop, 
  isDebugging, 
  isExecuting, 
  activeExecutionId
}) {
  return (
    <ButtonGroup className="border-none bg-transparent">
      {/* <ThemeToggle /> */}
      <ButtonGroup>
        <Button
          variant="outline"
          size="sm"
          onClick={onDebug}
          disabled={isDebugging}
          className="w-full justify-start"
        >
          <BugIcon className="h-3.5 w-3.5 mr-1" />
          Debug
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onExecute}
          disabled={isExecuting}
          className="w-full justify-start"
        >
          {isExecuting ? (
              <>
                <PauseIcon className="h-3.5 w-3.5 mr-1.5" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="h-3.5 w-3.5 mr-1.5" />
                Run
              </>
            )}      
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button
          variant="outline" 
          size="sm" 
          onClick={onStop}
          disabled={!activeExecutionId}
          className="w-full justify-start"
        >
          <SquareIcon className="h-3.5 w-3.5 mr-1" />
          Stop
        </Button>
      </ButtonGroup>
    </ButtonGroup>
  )
}