import { useLocation } from 'react-router-dom';

export const useRouteContext = () => {
  const location = useLocation();
  const isRadioChat = location.pathname === '/radiochat';
  
  return {
    isRadioChat,
    currentPath: location.pathname
  };
};
