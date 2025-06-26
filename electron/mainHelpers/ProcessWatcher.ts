import psList from 'ps-list';
import path from 'path';

export async function waitForGameProcess(exePath: string, pollInterval = 1000): Promise<{ pid: number, name: string } | null> {
    const exeName = path.basename(exePath).toLowerCase();
    console.log(`[waitForGameProcess] Waiting for process ${exeName}`);

    while (true) {
        const processes = await psList();
        const match = processes.find(p => p.name.toLowerCase() === exeName);
        if (match) {
            console.log(`[waitForGameProcess] Found process: ${match.name} (pid ${match.pid})`);
            return match;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}

export function monitorExternalProcess(pid: number, onExit: () => void): { stop: () => void } {
    // Verify process exists first
    try {
      // Check if process exists initially
      const initialCheck = require('child_process').spawnSync(
        'tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
        { encoding: 'utf8' }
      );
      
      // Process doesn't exist if output doesn't contain the PID
      if (!initialCheck.stdout.includes(String(pid))) {
        console.log(`Process with PID ${pid} not found`);
        process.nextTick(onExit); // Call exit handler on next tick
        return { stop: () => {} };
      }
    } catch (err) {
      console.error('Error checking process existence:', err);
      return { stop: () => {} };
    }
  
    console.log(`Monitoring external process with PID: ${pid}`);
    let isRunning = true;
    
    // Poll the process status periodically
    const interval: NodeJS.Timeout = setInterval(() => {
      if (!isRunning) return;
      
      try {
        const result = require('child_process').spawnSync(
          'tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
          { encoding: 'utf8' }
        );
        
        // Process has exited if output doesn't contain the PID
        if (!result.stdout.includes(String(pid))) {
          console.log(`Process with PID ${pid} has exited`);
          clearInterval(interval);
          isRunning = false;
          onExit();
        }
      } catch (err) {
        console.error('Error polling process status:', err);
      }
    }, 1000); // Poll every second (adjust as needed)
    
    // Return a function to stop monitoring
    return {
      stop: () => {
        if (isRunning) {
          clearInterval(interval);
          isRunning = false;
        }
      }
    };
  }

/**
 * Checks if any of the given executable paths are running (by basename, case-insensitive)
 */
export async function areAnyExecutablesRunning(executablePaths: string[]): Promise<boolean> {
    if (!executablePaths || executablePaths.length === 0) return false;
    const exeNames = executablePaths.map(p => path.basename(p).toLowerCase());
    const processes = await psList();
    return processes.some(proc => exeNames.includes(proc.name.toLowerCase()));
}

/**
 * Finds the first running process for any of the given executable paths (by basename, case-insensitive)
 * Returns { pid, name } or null if none are running
 */
export async function findRunningExecutableProcess(executablePaths: string[]): Promise<{ pid: number, name: string } | null> {
    if (!executablePaths || executablePaths.length === 0) return null;
    const exeNames = executablePaths.map(p => path.basename(p).toLowerCase());
    const processes = await psList();
    const match = processes.find(proc => exeNames.includes(proc.name.toLowerCase()));
    return match ? { pid: match.pid, name: match.name } : null;
}