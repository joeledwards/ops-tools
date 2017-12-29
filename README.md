# ops-tools
A suite of tools to help @buzuli be more productive at DevOps.

## Dependencies
- Node.js >=8.0.0
- npm >=5.0.0

## Installing
```
$ npm i -g @buzuli/ops-tools
```

## Usage
```
$ ops
ops <command>

Commands:
  ops alarms                             list configured cloudwatch alarms
  ops ec2-can-run                        test if a particular EC2
                                         configuration will run
  ops ec2-find                           find an EC2 instance
  ops nsq-peek <topic>                   peek at messages in the named topic
  ops replicate-ami <src-region>         replicate an AMI from one region to
  <src-ami>                              all others
```
