# CLI for Unity Cloud Build

## Installation

You can install the CLI using npm. Note that you will need to install
[Node.js](http://nodejs.org/) and [npm](https://npmjs.org/). Installing Node.js should install npm as well.

To install the CLI run the following command:

```bash
npm install -g ucb-cli
```

## Commands

The command ucb-cli --help lists the available commands, and ucb-cli <command> --help displays the details of individual commands.

The following is a brief list of available commands and their functions:

```
 $ ucb-cli --help
Usage: ucb-cli <command> [options]

Commands:
  config <command>           global settings commands
  project <command>          project setting commands
  target <command>           target group setting commands
  build <groupName> [label]  get build information command
  share <command>            share link modification commands

Options:
  --version  Show version number  [boolean]
  --help     Show help  [boolean]
  --apikey  [string]
  --orgid  [string]
  --raw  [boolean] [default: false]
```

### config command

setup APIKey and Organization ID as follows.

```
$ ucb-cli config set apikey XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
$ ucb-cli config set orgid YYYYYYYYYYYYYY
```

### project command

list all of projects belonging to your organization.

```
$ ucb-cli project list

[
  {
    name: 'Project1',
    guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  },
  {
    name: 'Project2',
    guid: 'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj',
  },
  ... snip ...
]
```

#### Register project and select as the current project

Name and register the project with the Id by `project add` command.
The project registered at first time is selected as the current project.

```
$ ucb-cli project add proj1 aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
$ ucb-cli project add proj2 ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj
```

Select the current project with `project use` command.

```
$ ucb-cli project use proj1
```

### target command

List all of targets defined to the current project.

```
$ ucb-cli target list
[
  'main-windows-desktop-64-bit',
  'main-android',
  'main-ios',
  'main-mac-desktop-universal',
  'main-quest',
  'develop-ios',
  'develop-quest',
  'develop-mac-desktop-universal',
  'develop-windows-desktop-64-bit',
  'develop-android'
]
```

### Define target group to indicate multiple build target at once

Add `main` target group as follows.

```
$ ucb-cli target add main \
 main-windows-desktop-64-bit \
 main-mac-desktop-universal \
 main-android \
 main-quest
```

By this command, you can specify multiple build target by `main`.

`target` command simply print target groups defined to the current project.

```
$ ucb-cli target
[
  {
    name: 'main',
    targets: [
      'main-windows-desktop-64-bit',
      'main-mac-desktop-universal',
      'main-android',
      'main-quest'
    ]
  },
  ... snip ...
```

### build command

Show the build information of the target group specified by `build` command.

#### Get the latest build information

If you specify only a target group, you will get the latest build information for each targets.

Below example shows the latest build information containing the ShareLink url for each 4 build target of `main` target group (real url are snipped).

```
$ ucb-cli build main
[
  {
    build: 49,
    favorited: false,
    hash: '12fc419412ee076fe93b7c47fe483c16d678eb98',
    target: 'main-windows-desktop-64-bit',
    date: '2023-05-04T11:44:09.000Z',
    branch: 'main',
    platform: 'standalonewindows64',
    share_link: ... snip ...,
    expire: '2023-05-18T11:44:11.021Z'
  },
  {
    build: 47,
    favorited: false,
    hash: '12fc419412ee076fe93b7c47fe483c16d678eb98',
    target: 'main-mac-desktop-universal',
    date: '2023-04-28T07:52:43.000Z',
    branch: 'main',
    platform: 'standaloneosxuniversal',
    share_link: ... snip ...,
    expire: '2023-05-12T07:52:48.090Z'
  },
  {
    build: 49,
    favorited: false,
    hash: '12fc419412ee076fe93b7c47fe483c16d678eb98',
    target: 'main-android',
    date: '2023-04-28T07:44:22.000Z',
    branch: 'main',
    platform: 'android',
    share_link: ... snip ...,
    expire: '2023-05-12T07:44:23.964Z'
  },
  {
    build: 32,
    favorited: false,
    hash: '12fc419412ee076fe93b7c47fe483c16d678eb98',
    target: 'main-quest',
    date: '2023-04-28T07:34:05.000Z',
    branch: 'main',
    platform: 'android',
    share_link: ... snip ...,
    expire: '2023-05-12T07:34:16.455Z'
  }
]
```

#### Get the build information with the specific label

When specify **label** as second argument, you will get the build information which are specified label added.

Label can be appended to each build from UCB WebUI.

Below example shows the different build information of `main` target group than the previous example.

```
$ ucb-cli build main release/20230217-1.2.3-rc
[
  {
    build: 34,
    favorited: true,
    hash: 'b5856fe72896c0dba9c9c11be7c42efa80d2b207',
    target: 'develop-windows-desktop-64-bit',
    date: '2023-02-17T09:52:36.000Z',
    branch: 'main',
    platform: 'standalonewindows64',
    share_link: '',
    expire: undefined
  },
  {
    build: 33,
    favorited: true,
    hash: 'b5856fe72896c0dba9c9c11be7c42efa80d2b207',
    target: 'main-mac-desktop-universal',
    date: '2023-02-17T09:41:45.000Z',
    branch: 'main',
    platform: 'standaloneosxuniversal',
    share_link: '',
    expire: undefined
  },
  {
    build: 34,
    favorited: true,
    hash: 'b5856fe72896c0dba9c9c11be7c42efa80d2b207',
    target: 'main-android',
    date: '2023-02-17T09:36:54.000Z',
    branch: 'main',
    platform: 'android',
    share_link: '',
    expire: undefined
  },
  {
    build: 19,
    favorited: true,
    hash: 'b5856fe72896c0dba9c9c11be7c42efa80d2b207',
    target: 'main-quest',
    date: '2023-02-17T09:51:10.000Z',
    branch: 'main',
    platform: 'android',
    share_link: '',
    expire: undefined
  }
]
```

### share command

You can update the ShareLink expiration date with the `share create` command.

Below specify the expiration date of the latest builds of `main` target group to `2024-04-01` .

```
$ ucb-cli share create main 2024-04-01
create share link
```

Also, you can specify label by third argument as below

```
$ ucb-cli share create main 2024-04-01 release/20230217-1.2.3-rc
create share link
```

ShareLinks can be deleted by `share delete` comands as below.

```
$ ucb-cli share delete main release/20230217-1.2.3-rc
delete share link
```

