import axios from 'axios';
import * as config from './config';

const endpoint = 'https://build-api.cloud.unity3d.com/api/v1';

let _apikey: string = '';
let _orgid: string = '';
let _projectName: string = '';

export function setup(apikey: string, orgid: string): void {
  _apikey = apikey;
  _orgid = orgid;
}

export function setProject(projectName: string): void {
  _projectName = projectName;
}

function getUrl(): string {
  const project = config.getProject(_projectName);
  return `${endpoint}/orgs/${_orgid}/projects/${project?.id ?? ''}`;
}

function getTargets(targetGroup: string): string[] {
  return config.getTargetIds(targetGroup);
}

export async function getProjects(raw = false): Promise<string[]> {
  const resp = await axios.get(`${endpoint}/orgs/${_orgid}/projects`, {
    headers: {
      Authorization: `Basic ${_apikey}`,
    },
  });
  return resp.data.map((item: any) => {
    return raw
      ? item
      : {
          name: item.name,
          guid: item.guid,
          created: item.created,
        };
  });
}

export async function getBuildTargets(): Promise<string[]> {
  const resp = await axios.get(`${getUrl()}/buildtargets`, {
    headers: {
      Authorization: `Basic ${_apikey}`,
    },
  });
  return resp.data.map((item: any) => item.buildtargetid);
}

type ShareLink = {
  shareid: string;
  expire: string;
};

async function getBuildShareLink(target: string, build: number): Promise<ShareLink | undefined> {
  try {
    const resp = await axios.get(`${getUrl()}/buildtargets/${target}/builds/${build}/share`, {
      headers: {
        Authorization: `Basic ${_apikey}`,
      },
    });
    return {
      shareid: resp.data.shareid,
      expire: resp.data.shareExpiry,
    };
  } catch (e) {
    return undefined;
  }
}

type BuildInfo = {
  build: number;
  favorited: boolean;
  target: string;
  hash: string;
  date: string;
  branch: string;
  label: string;
  platform: string;
  share_link?: string;
  expire?: string;
};

function toBuildInfo(item: any): BuildInfo {
  return {
    build: item.build,
    favorited: item.favorited,
    hash: item.lastBuiltRevision,
    target: item.buildtargetid,
    date: item.finished,
    branch: item.scmBranch,
    platform: item.platform,
    label: item.label,
  };
}

export type BuildObjectKey = 'label' | 'lastBuiltRevision' | 'scmBranch';

async function getTargetBuildsBySearch(
  target: string,
  search: string,
  key: BuildObjectKey,
  share: boolean = true
): Promise<BuildInfo[]> {
  let searchQuery = '';
  if (key == 'label') searchQuery = `&search=${search}`;
  // console.log(`${getUrl()}/buildtargets/${target}/builds?per_page=500&page=1${searchQuery}`);
  const resp = await axios.get(`${getUrl()}/buildtargets/${target}/builds?per_page=500&page=1${searchQuery}`, {
    headers: {
      Authorization: `Basic ${_apikey}`,
    },
  });
  // console.log(resp.data.filter((item: any) => item[key] === search).map((item: any) => item[key]));
  const result = resp.data.filter((item: any) => item[key] === search).map(toBuildInfo);
  if (!share) return result;
  return await Promise.all(
    result.map(async (info: BuildInfo) => {
      const sl = await getBuildShareLink(target, info.build);
      return {
        ...info,
        share_link: sl != undefined ? `https://developer.cloud.unity3d.com/share/share.html?shareId=${sl.shareid}` : '',
        expire: sl?.expire,
      };
    })
  );
}

async function getTargetBuildsLatest(target: string, share: boolean = true): Promise<BuildInfo> {
  const resp = await axios.get(`${getUrl()}/buildtargets/${target}/builds?latestBuildPerPlatformOnly=true`, {
    headers: {
      Authorization: `Basic ${_apikey}`,
    },
  });
  const result: BuildInfo = resp.data.map(toBuildInfo)[0];
  if (!share) return result;
  {
    const sl = await getBuildShareLink(target, result.build);
    return {
      ...result,
      share_link: sl != undefined ? `https://developer.cloud.unity3d.com/share/share.html?shareId=${sl.shareid}` : '',
      expire: sl?.expire,
    };
  }
}

export async function getBuilds(
  targetGroup: string,
  search?: string,
  hash: boolean = false,
  branch: boolean = false
): Promise<BuildInfo[]> {
  const result: BuildInfo[] = [];
  const getKey = (): BuildObjectKey => {
    if (hash) return 'lastBuiltRevision';
    else if (branch) return 'scmBranch';
    return 'label';
  };
  const key = getKey();
  // console.log(`getBuilds(${targetGroup},${search},hash=${hash},branch=${branch})`);
  for (const target of getTargets(targetGroup)) {
    if (search != undefined) {
      const info = await getTargetBuildsBySearch(target, search, key);
      result.push(...info);
    } else {
      const info = await getTargetBuildsLatest(target);
      result.push(info);
    }
  }
  return result;
}

async function createShareLinkToLabel(target: string, date: string, label: string): Promise<void> {
  const builds = await getTargetBuildsBySearch(target, label, 'label', false);
  for (const info of builds) {
    await axios.post(
      `${getUrl()}/buildtargets/${target}/builds/${info.build}/share`,
      {
        shareExpiry: date,
      },
      {
        headers: {
          Authorization: `Basic ${_apikey}`,
        },
      }
    );
  }
}

async function createShareLinkToLatest(target: string, date: string): Promise<void> {
  const info = await getTargetBuildsLatest(target, false);
  await axios.post(
    `${getUrl()}/buildtargets/${target}/builds/${info.build}/share`,
    {
      shareExpiry: date,
    },
    {
      headers: {
        Authorization: `Basic ${_apikey}`,
      },
    }
  );
}

export async function createShareLinks(targetGroup: string, date: string, label?: string): Promise<void> {
  for (const target of getTargets(targetGroup)) {
    if (label != undefined) {
      await createShareLinkToLabel(target, date, label);
    } else {
      await createShareLinkToLatest(target, date);
    }
  }
}

async function deleteShareLinkToLabel(target: string, label: string): Promise<void> {
  const builds = await getTargetBuildsBySearch(target, label, 'label', false);
  for (const info of builds) {
    await axios.delete(`${getUrl()}/buildtargets/${target}/builds/${info.build}/share`, {
      headers: {
        Authorization: `Basic ${_apikey}`,
      },
    });
  }
}

async function deleteShareLinkToLatest(target: string): Promise<void> {
  const info = await getTargetBuildsLatest(target, false);
  await axios.delete(`${getUrl()}/buildtargets/${target}/builds/${info.build}/share`, {
    headers: {
      Authorization: `Basic ${_apikey}`,
    },
  });
}

export async function deleteShareLinks(targetGroup: string, label?: string): Promise<void> {
  for (const target of getTargets(targetGroup)) {
    if (label != undefined) {
      await deleteShareLinkToLabel(target, label);
    } else {
      await deleteShareLinkToLatest(target);
    }
  }
}
