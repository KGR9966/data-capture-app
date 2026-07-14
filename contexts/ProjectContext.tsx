import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Project } from "../services/projects";

const ACTIVE_PROJECT_KEY = "@data_capture_active_project";

interface ProjectContextType {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ACTIVE_PROJECT_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw) as Project;
          setActiveProjectState(parsed);
        } catch (error) {
          console.log("[ProjectContext] Kunne ikke parse gemt projekt", error);
        }
      })
      .catch((error) => {
        console.log("[ProjectContext] Kunne ikke indlæse gemt projekt", error);
      })
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project);
    if (project) {
      AsyncStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project)).catch(
        (error) => {
          console.log("[ProjectContext] Kunne ikke gemme aktivt projekt", error);
        }
      );
    } else {
      AsyncStorage.removeItem(ACTIVE_PROJECT_KEY).catch((error) => {
        console.log("[ProjectContext] Kunne ikke fjerne aktivt projekt", error);
      });
    }
  }, []);

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
