import axios from 'axios';
import * as config from './config';

const apikey = process.env.UCB_APIKEY;
const orgid = process.env.UCB_ORGID;
const endpoint = 'https://build-api.cloud.unity3d.com/api/v1';

function getProjectId(project: string): string {
  return config.getProjectId(project);
}

function getUrl(project: string): string {
  return `${endpoint}/orgs/${orgid}/projects/${getProjectId(project)}`;
}

function getTargets(group: string): string[] {
  return config.getTargetIds(group);
}

export async function getBuildTargets(project: string): Promise<string[]> {
  const resp = await axios.get(`${getUrl(project)}/buildtargets`, {
    headers: {
      Authorization: `Basic ${apikey}`,
    },
  });
  return resp.data.map((item: any) => item.buildtargetid);
}

export type ShareLink = {
  shareid: string;
  expire: string;
};

async function getBuildShareLink(project: string, target: string, build: number): Promise<ShareLink | undefined> {
  try {
    const resp = await axios.get(`${getUrl(project)}/buildtargets/${target}/builds/${build}/share`, {
      headers: {
        Authorization: `Basic ${apikey}`,
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

export type BuildInfo = {
  build: number;
  favorited: boolean;
  target: string;
  hash: string;
  share_link?: string;
  expire?: string;
};

async function getTargetBuildsByLabel(
  project: string,
  target: string,
  label: string,
  share: boolean = true
): Promise<BuildInfo[]> {
  const resp = await axios.get(`${getUrl(project)}/buildtargets/${target}/builds?per_page=500&page=1`, {
    headers: {
      Authorization: `Basic ${apikey}`,
    },
  });
  // console.log(resp.data.map((item: any) => item.label));
  const result = resp.data
    .filter((item: any) => item.label === label)
    .map((item: any) => {
      const info: BuildInfo = {
        build: item.build,
        favorited: item.favorited,
        hash: item.lastBuiltRevision,
        target: item.buildtargetid,
      };
      return info;
    });
  if (!share) return result;
  return await Promise.all(
    result.map(async (info: BuildInfo) => {
      const sl = await getBuildShareLink(project, target, info.build);
      return {
        ...info,
        share_link: sl != undefined ? `https://developer.cloud.unity3d.com/share/share.html?shareId=${sl.shareid}` : '',
        expire: sl?.expire,
      };
    })
  );
}

async function getTargetBuildsLatest(project: string, target: string, share: boolean = true): Promise<BuildInfo> {
  const resp = await axios.get(`${getUrl(project)}/buildtargets/${target}/builds?latestBuildPerPlatformOnly=true`, {
    headers: {
      Authorization: `Basic ${apikey}`,
    },
  });
  const result: BuildInfo = resp.data.map((item: any) => {
    const info: BuildInfo = {
      build: item.build,
      favorited: item.favorited,
      hash: item.lastBuiltRevision,
      target: item.buildtargetid,
    };
    return info;
  })[0];
  if (!share) return result;
  {
    const sl = await getBuildShareLink(project, target, result.build);
    return {
      ...result,
      share_link: sl != undefined ? `https://developer.cloud.unity3d.com/share/share.html?shareId=${sl.shareid}` : '',
      expire: sl?.expire,
    };
  }
}

export async function getBuilds(project: string, targetGroup: string, label?: string): Promise<BuildInfo[]> {
  const result: BuildInfo[] = [];
  for (const target of getTargets(targetGroup)) {
    if (label != undefined) {
      const info = await getTargetBuildsByLabel(project, target, label);
      result.push(...info);
    } else {
      const info = await getTargetBuildsLatest(project, target);
      result.push(info);
    }
  }
  return result;
}

async function createShareLinkToLabel(project: string, target: string, date: string, label: string): Promise<void> {
  const builds = await getTargetBuildsByLabel(project, target, label, false);
  for (const info of builds) {
    await axios.post(
      `${getUrl(project)}/buildtargets/${target}/builds/${info.build}/share`,
      {
        shareExpiry: date,
      },
      {
        headers: {
          Authorization: `Basic ${apikey}`,
        },
      }
    );
  }
}

async function createShareLinkToLatest(project: string, target: string, date: string): Promise<void> {
  const info = await getTargetBuildsLatest(project, target, false);
  await axios.post(
    `${getUrl(project)}/buildtargets/${target}/builds/${info.build}/share`,
    {
      shareExpiry: date,
    },
    {
      headers: {
        Authorization: `Basic ${apikey}`,
      },
    }
  );
}

export async function createShareLinks(
  project: string,
  targetGroup: string,
  date: string,
  label?: string
): Promise<void> {
  for (const target of getTargets(targetGroup)) {
    if (label != undefined) {
      await createShareLinkToLabel(project, target, date, label);
    } else {
      await createShareLinkToLatest(project, target, date);
    }
  }
}

async function deleteShareLinkToLabel(project: string, target: string, label: string): Promise<void> {
  const builds = await getTargetBuildsByLabel(project, target, label, false);
  for (const info of builds) {
    await axios.delete(`${getUrl(project)}/buildtargets/${target}/builds/${info.build}/share`, {
      headers: {
        Authorization: `Basic ${apikey}`,
      },
    });
  }
}

async function deleteShareLinkToLatest(project: string, target: string): Promise<void> {
  const info = await getTargetBuildsLatest(project, target, false);
  await axios.delete(`${getUrl(project)}/buildtargets/${target}/builds/${info.build}/share`, {
    headers: {
      Authorization: `Basic ${apikey}`,
    },
  });
}

export async function deleteShareLinks(project: string, targetGroup: string, label?: string): Promise<void> {
  for (const target of getTargets(targetGroup)) {
    if (label != undefined) {
      await deleteShareLinkToLabel(project, target, label);
    } else {
      await deleteShareLinkToLatest(project, target);
    }
  }
}
