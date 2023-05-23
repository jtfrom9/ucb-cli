import yargs from 'yargs';
import * as ucb from './ucb';
import * as config from './config';
import { AxiosError } from 'axios';

export async function main(): Promise<void> {
  const args = yargs.demandCommand(1).help().wrap(null).strictOptions().strictCommands();
  const scriptName = 'ucb-cli';

  args.usage(`Usage: ${scriptName} <command> [options]`);
  args.scriptName('');

  args
    .option('apikey', { type: 'string' })
    .option('orgid', { type: 'string' })
    .option('raw', { type: 'boolean', default: false })
    .middleware((args) => {
      // besides 'project' commands, check current project setting
      if (args._[0] != 'config') {
        const apikey = args.apikey ?? config.getConfig('apikey');
        if (apikey == '') {
          console.error('No apikey defined');
          yargs.exit(-1, new Error());
        }
        const orgid = args.orgid ?? config.getConfig('orgid');
        if (orgid == '') {
          console.error('No orgid defined');
          yargs.exit(-1, new Error());
        }
        ucb.setup(apikey, orgid);
      }
      if (args._[0] != 'project' && args._[0] != 'config') {
        const project = config.getCurrentProjectName();
        if (project == '') {
          console.error('No project selected');
          yargs.exit(-1, new Error());
        }
        ucb.setProject(project);
      }
    })
    .command('config <command>', 'global settings commands', async (args) => {
      args
        .demandCommand(1)
        .strictCommands()
        .positional('key', { type: 'string', choices: config.ConfigKeys })
        .positional('val', { type: 'string' })
        .command({
          command: 'set <key> <val>',
          describe: 'set config value',
          handler: (args) => {
            config.setConfig(args.key, args.val);
          },
        })
        .command({
          command: 'dump',
          describe: 'print config as raw dump',
          handler: config.dump,
        });
    })
    .command('project <command>', 'project setting commands', (args) => {
      args
        .demandCommand(1)
        .strictCommands()
        .positional('name', { type: 'string', description: 'project name' })
        .positional('id', { type: 'string', description: 'project id' })
        .command({
          command: '*',
          handler: config.printProjects,
        })
        .command({
          command: 'add <name> <id>',
          describe: 'add new project definition',
          handler: async (args) => {
            const err = config.addProject(args.name, args.id);
            if (err != undefined) {
              console.error(err);
            }
          },
        })
        .command({
          command: 'remove <name>',
          describe: 'remove project definition',
          aliases: ['rm'],
          handler: async (args) => {
            const err = config.removeProject(args.name);
            if (err != undefined) {
              console.error(err);
            }
          },
        })
        .command({
          command: 'use <name>',
          describe: 'set current project',
          handler: async (args) => {
            const err = config.useProject(args.name);
            if (err != undefined) {
              console.error(err);
            }
          },
        })
        .command({
          command: 'list',
          describe: 'list all project',
          handler: async (args) => {
            const projects = await ucb.getProjects(args.raw);
            console.dir(projects, { depth: null });
          },
        });
    })
    .command('target <command>', 'target group setting commands', (args) => {
      args
        .demandCommand(1)
        .strictCommands()
        .command({
          command: '*',
          handler: config.printTargets,
        })
        .positional('groupName', { type: 'string' })
        .positional('targetid', { type: 'string' })
        .positional('targetids', { array: true })
        .command({
          command: 'add <groupName> <targetids..>',
          describe: 'add target group',
          handler: (args) => {
            config.addTargets(args.groupName, args.targetids);
          },
        })
        .command({
          command: 'remove <groupName>',
          aliases: ['rm'],
          describe: 'remove target group',
          handler: (args) => {
            config.removeTargets(args.groupName);
          },
        })
        .command({
          command: 'update <groupName> <targetids..>',
          describe: 'update target group',
          handler: (args) => {
            config.addTargets(args.groupName, args.targetids, true);
          },
        })
        .command({
          command: 'clear <groupName>',
          describe: 'clear target group',
          handler: (args) => {
            config.clearTarget(args.groupName);
          },
        })
        .command({
          command: 'list',
          handler: async (args) => {
            const ids = await ucb.getBuildTargets();
            console.log(ids);
          },
        });
    })
    .command('build <command>', 'get build information command', (args) => {
      args
        .positional('groupName', { type: 'string', choices: config.getGroupNames() })
        .positional('label', { type: 'string' })
        .option('markdown', { alias: 'm', type: 'boolean', describe: 'show as markdown' })
        .option('hash', { alias: 'c', type: 'boolean', default: false, describe: 'hash value instead of groupname' })
        .option('branch', { alias: 'b', type: 'boolean', default: false, describe: 'branch name instead of groupname' })
        .command({
          command: 'show <groupName> [label]',
          aliases: ['get'],
          describe: 'show build information',
          handler: async (args) => {
            const builds = await ucb.getBuilds(args.groupName, args.label, args.hash, args.branch);
            if (!args.markdown) {
              console.log(builds);
            } else {
              if (args.label != undefined) {
                console.log(`label: ${args.label}`);
              } else {
                console.log(`latest`);
              }
              for (const info of builds) {
                console.log(`[${info.target}#${info.build}](${info.share_link})`);
              }
            }
          },
        });
    })
    .command('share <command>', 'share link modification commands', (args) => {
      args
        .demandCommand(1)
        .strictCommands()
        .positional('groupName', { type: 'string' })
        .positional('date', { type: 'string' })
        .positional('label', { type: 'string' })
        .command({
          command: 'create <groupName> <date> [label]',
          describe: 'create share link',
          handler: async (args) => {
            console.log('create share link');
            await ucb.createShareLinks(args.groupName, args.date, args.label);
          },
        })
        .command({
          command: 'delete <groupName> [label]',
          describe: 'delete share link',
          handler: async (args) => {
            console.log('delete share link');
            await ucb.deleteShareLinks(args.groupName, args.label);
          },
        });
    })
    .fail(() => {});

  try {
    await args.parse();
  } catch (e) {
    if (e instanceof AxiosError) {
      console.error(`${e}`);
      if (e.config != undefined) {
        console.log(`  method: ${e.config.method}`);
        console.log(`     url: ${e.config.url}`);
      }
    } else {
      console.error(`${e}`);
    }
  }
}
