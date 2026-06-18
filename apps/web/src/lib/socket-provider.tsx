'use client';

import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  reconnecting: boolean;
  isConnecting: boolean;
  joinWorkspace: (workspaceId: string) => void;
  leaveWorkspace: (workspaceId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  reconnecting: false,
  isConnecting: false,
  joinWorkspace: () => {},
  leaveWorkspace: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const activeWorkspacesRef = useRef<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
        setReconnecting(false);
        setIsConnecting(false);
      }
      return;
    }

    setIsConnecting(true);

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      setIsConnecting(false);
      // Re-join all active workspace rooms after reconnect
      for (const wsId of activeWorkspacesRef.current) {
        socket.emit('join:workspace', { workspaceId: wsId });
      }
      // Re-join department room
      if (user.departmentId) {
        socket.emit('join:department', { departmentId: user.departmentId });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('reconnect_attempt', () => {
      setReconnecting(true);
    });

    socket.on('reconnect_failed', () => {
      setReconnecting(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setConnected(false);
      setIsConnecting(false);
    });

    // Auto-join department room on first connect
    if (user.departmentId) {
      socket.emit('join:department', { departmentId: user.departmentId });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setReconnecting(false);
      setIsConnecting(false);
    };
  }, [token, user]);

  const joinWorkspace = useCallback((workspaceId: string) => {
    activeWorkspacesRef.current.add(workspaceId);
    socketRef.current?.emit('join:workspace', { workspaceId });
  }, []);

  const leaveWorkspace = useCallback((workspaceId: string) => {
    activeWorkspacesRef.current.delete(workspaceId);
    socketRef.current?.emit('leave:workspace', { workspaceId });
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, reconnecting, isConnecting, joinWorkspace, leaveWorkspace }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export function useWorkspaceSocket(
  workspaceId: string | null,
  handlers: Record<string, (data: Record<string, unknown>) => void>,
  onReconnect?: () => void,
) {
  const { socket, connected, joinWorkspace, leaveWorkspace } = useSocket();
  const prevConnectedRef = useRef(false);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!socket || !workspaceId) return;
    joinWorkspace(workspaceId);

    const entries = Object.entries(handlers);
    entries.forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      leaveWorkspace(workspaceId);
      entries.forEach(([event, handler]) => socket.off(event, handler));
    };
    // handlers is intentionally excluded — callers must memoize their handler object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, workspaceId, joinWorkspace, leaveWorkspace]);

  // Call onReconnect when socket transitions from disconnected to connected
  useEffect(() => {
    if (connected && !prevConnectedRef.current && workspaceId) {
      onReconnectRef.current?.();
    }
    prevConnectedRef.current = connected;
  }, [connected, workspaceId]);
}
