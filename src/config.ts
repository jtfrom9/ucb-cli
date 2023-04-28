import Conf from 'conf';
import { readFileSync, existsSync } from 'fs';

const conf = new Conf();

export function dump(): void {
  console.log(`path: ${conf.path}`);
  if (existsSync(conf.path)) {
    console.log(readFileSync(conf.path, 'utf8'));
  }
}
export function getCurrentProjectName(): string {
  return conf.get('current', '') as string;
}

type TargetGroup = {
  name: string;
  targets: string[];
};

type Project = {
  name: string;
  id: string;
  targetGroups: TargetGroup[];
};

export function getProject(project: string): Project | undefined {
  return conf.get(project, undefined) as Project | undefined;
}

export function getProjectId(project: string): string {
  const proj = getProject(project);
  return proj?.id ?? '';
}

export function getCurrentProject(): Project | undefined {
  return getProject(getCurrentProjectName());
}

export function printProjects(): void {
  const projects = conf.get('projects', []) as string[];
  if (projects.length == 0) {
    console.error('No project');
    return;
  }
  const current = getCurrentProjectName();
  if (current != undefined) {
    console.log(`current: ${current}`);
  }
  for (const name of projects) {
    const project = conf.get(name, {}) as Project;
    console.dir(project, { depth: null });
  }
}

export function addProject(name: string, id: string): string | undefined {
  const projects = conf.get('projects', []) as string[];
  if (projects.includes(name)) {
    return `Already exists project: "${name}"`;
  }
  const project: Project = {
    name,
    id,
    targetGroups: [],
  };
  conf.set(name, project);
  projects.push(name);
  conf.set('projects', projects);
  const current = getCurrentProjectName();
  if (current == undefined) conf.set('current', name);
  return undefined;
}

export function deleteProject(name: string): string | undefined {
  const projects = conf.get('projects', []) as string[];
  if (!projects.includes(name)) {
    return `No project: "${name}"`;
  }
  conf.delete(name);
  const index = projects.indexOf(name);
  if (index > -1) projects.splice(index, 1);
  conf.set('projects', projects);
  return undefined;
}

export function useProject(name: string): string | undefined {
  const projects = conf.get('projects', []) as string[];
  if (!projects.includes(name)) {
    return `No project: "${name}"`;
  }
  conf.set('current', name);
  return undefined;
}

export function addTargets(groupName: string, targetIds: string[]): string | undefined {
  const project = getCurrentProject();
  if (project == undefined) {
    return `Invalid Current Project`;
  }
  const group = project.targetGroups.find((group) => group.name === groupName);
  if (group == undefined) {
    project.targetGroups.push({
      name: groupName,
      targets: targetIds,
    });
  } else {
    group.targets.push(...targetIds);
  }
  conf.set(project.name, project);
  return undefined;
}

export function clearTarget(groupName: string): void {
  const project = getCurrentProject();
  if (project == undefined) {
    console.error(`Invalid Current Project`);
    return;
  }
  const group = project.targetGroups.find((group) => group.name === groupName);
  if (group == undefined) {
    console.log(`No group: ${groupName}`);
  } else {
    group.targets = [];
  }
  conf.set(project.name, project);
}

export function printTargets(): void {
  const project = getCurrentProject();
  if (project == undefined) {
    console.error(`Invalid Current Project`);
    return;
  }
  console.dir(project.targetGroups, { depth: null });
}

export function getTargetIds(groupName: string): string[] {
  const project = getCurrentProject();
  if (project == undefined) {
    return [];
  }
  const group = project.targetGroups.find((group) => group.name === groupName);
  return group?.targets ?? [];
}
