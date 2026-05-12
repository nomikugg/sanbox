import { executeCode, stopExecution, debugCode, transpileCode } from '../ipc/client.js';

export default function useIpc() {
  return {
    transpileCode: (payload) => transpileCode(payload.code, payload.language),
    executeCode: (payload) => executeCode(payload),
    debugCode: (payload) => debugCode(payload),
    stopExecution: (executionId) => stopExecution(executionId),
  };
}
