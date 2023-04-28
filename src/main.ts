import yargs from 'yargs';
import { createShareLinks, deleteShareLinks, getBuilds, getBuildTargets } from './ucb';
import * as config from './config';

let project: string = '';

export async function main(): Promise<void> {
  const args = yargs.demandCommand(1).help().wrap(null).strictOptions();
  const scriptName = 'ucb-cli';

  args.usage(`Usage: ${scriptName}`);
  args.scriptName('');

  args
    .middleware((args) => {
      // besides 'project' commands, check current project setting
      if (args._[0] != 'project') {
        project = config.getCurrentProjectName();
        if (project == '') {
          console.error('No project selected');
          yargs.exit(-1, new Error());
        }
      }
    })
    .command('project', 'project configuration', (args) => {
      args
        .command({
          command: '*',
          handler: config.printProjects,
        })
        .command({
          command: 'dump',
          handler: config.dump,
        })
        .positional('name', {
          type: 'string',
        })
        .positional('id', {
          type: 'string',
        })
        .command({
          command: 'add <name> <id>',
          handler: async (args) => {
            const err = config.addProject(args.name, args.id);
            if (err != undefined) {
              console.error(err);
            }
          },
        })
        .command({
          command: 'delete <name>',
          handler: async (args) => {
            const err = config.deleteProject(args.name);
            if (err != undefined) {
              console.error(err);
            }
          },
        })
        .command({
          command: 'use <name>',
          handler: async (args) => {
            const err = config.useProject(args.name);
            if (err != undefined) {
              console.error(err);
            }
          },
        });
    })
    .command('target', 'build target configuration', (args) => {
      args
        .command({
          command: '*',
          handler: async (args) => {
            const ids = await getBuildTargets(project);
            console.log(ids);
          },
        })
        .command({
          command: 'print',
          handler: config.printTargets,
        })
        .positional('groupName', { type: 'string' })
        .positional('targetid', { type: 'string' })
        .positional('targetids', { array: true })
        .command({
          command: 'add <groupName> <targetids..>',
          handler: (args) => {
            config.addTargets(args.groupName, args.targetids);
          },
        })
        .command({
          command: 'clear <groupName>',
          handler: (args) => {
            config.clearTarget(args.groupName);
          },
        });
    })
    .command('build', 'build result infomation', (args) => {
      args
        .positional('groupName', { type: 'string' })
        .positional('label', { demandOption: false, default: undefined, type: 'string' })
        .option('markdown', {
          alias: 'm',
          type: 'boolean',
        })
        .command({
          command: '* <groupName> [label]',
          handler: async (args) => {
            const builds = await getBuilds(project, args.groupName, args.label);
            if (!args.markdown) {
              console.log(builds);
            } else {
              console.log(`label: ${args.label}`);
              for (const info of builds) {
                console.log(`[${info.target}#${info.build}](${info.share_link})`);
              }
            }
          },
        });
    })
    .command('share', 'share link manipuration', (args) => {
      args
        .positional('groupName', { type: 'string' })
        .positional('date', { type: 'string' })
        .positional('label', { type: 'string' })
        .command({
          command: 'create <groupName> <date> [label]',
          handler: async (args) => {
            console.log('create share link');
            await createShareLinks(project, args.groupName, args.date, args.label);
          },
        })
        .command({
          command: 'delete <groupName> [label]',
          handler: async (args) => {
            console.log('delete share link');
            await deleteShareLinks(project, args.groupName, args.label);
          },
        });
    })
    .help();

  await args.parse();
}
