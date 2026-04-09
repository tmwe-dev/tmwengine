interface IntegratedAuthGuardProps {
  children: React.ReactNode;
}

export const IntegratedAuthGuard = ({ children }: IntegratedAuthGuardProps) => {
  return <>{children}</>;
};
