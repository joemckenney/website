import type { TerminalLine } from "../components/terminal";

type LogCallback = (line: TerminalLine) => void;

class TerminalLogger {
  private listeners: Set<LogCallback> = new Set();

  addListener(callback: LogCallback) {
    this.listeners.add(callback);
  }

  removeListener(callback: LogCallback) {
    this.listeners.delete(callback);
  }

  private log(text: string, type: TerminalLine["type"] = "output") {
    const line: TerminalLine = {
      text,
      type,
      timestamp: Date.now(),
    };

    for (const callback of this.listeners) {
      callback(line);
    }
  }

  info(text: string) {
    this.log(text, "info");
  }

  success(text: string) {
    this.log(text, "success");
  }

  warning(text: string) {
    this.log(text, "warning");
  }

  error(text: string) {
    this.log(text, "error");
  }

  prompt(text: string) {
    this.log(text, "prompt");
  }

  output(text: string) {
    this.log(text, "output");
  }

  clear() {
    // Signal to clear terminal (listeners can handle this)
    const line: TerminalLine = {
      text: "",
      type: "output",
      timestamp: Date.now(),
    };
    for (const callback of this.listeners) {
      callback(line);
    }
  }
}

export const logger = new TerminalLogger();
