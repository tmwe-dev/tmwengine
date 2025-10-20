import { useState, useCallback } from 'react';

export interface Command {
  execute: () => void | Promise<void>;
  undo: () => void | Promise<void>;
  description?: string;
}

export const useCommandHistory = () => {
  const [history, setHistory] = useState<Command[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const executeCommand = useCallback(async (command: Command) => {
    await command.execute();
    
    // Remove any commands after current index (handles redo invalidation)
    setHistory(prev => [...prev.slice(0, currentIndex + 1), command]);
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const undo = useCallback(async () => {
    if (currentIndex >= 0) {
      await history[currentIndex].undo();
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, history]);

  const redo = useCallback(async () => {
    if (currentIndex < history.length - 1) {
      await history[currentIndex + 1].execute();
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    executeCommand,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    historyLength: history.length,
    currentIndex,
  };
};

// Example Command Classes for common operations

export class MoveComponentCommand implements Command {
  constructor(
    private componentId: string,
    private oldPosition: { x: number; y: number; width: number; height: number },
    private newPosition: { x: number; y: number; width: number; height: number },
    private updateFn: (id: string, position: any) => Promise<void>
  ) {}

  async execute() {
    await this.updateFn(this.componentId, this.newPosition);
  }

  async undo() {
    await this.updateFn(this.componentId, this.oldPosition);
  }

  description = `Move component ${this.componentId}`;
}

export class UpdatePropsCommand implements Command {
  constructor(
    private componentId: string,
    private oldProps: Record<string, any>,
    private newProps: Record<string, any>,
    private updateFn: (id: string, props: any) => Promise<void>
  ) {}

  async execute() {
    await this.updateFn(this.componentId, this.newProps);
  }

  async undo() {
    await this.updateFn(this.componentId, this.oldProps);
  }

  description = `Update props for component ${this.componentId}`;
}

export class DeleteComponentCommand implements Command {
  constructor(
    private componentData: any,
    private deleteFn: (id: string) => Promise<void>,
    private createFn: (data: any) => Promise<void>
  ) {}

  async execute() {
    await this.deleteFn(this.componentData.id);
  }

  async undo() {
    await this.createFn(this.componentData);
  }

  description = `Delete component ${this.componentData.id}`;
}
