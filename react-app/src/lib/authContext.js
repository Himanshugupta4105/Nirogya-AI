import { createContext, useContext } from 'react';

export const AuthContext = createContext({ session: null, loading: true });
export const useAuth = () => useContext(AuthContext);
