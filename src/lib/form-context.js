import { createContext, useContext } from "react";
export const ValidationContext = createContext(() => undefined);
export const useFieldValidation = () => useContext(ValidationContext);
