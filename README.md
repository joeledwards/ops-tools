# ops-tools
[![Build Status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

A suite of tools to help @buzuli be more productive at DevOps.

## Dependencies
- Node.js >=8.0.0
- npm >=5.0.0

## Installing
```
$ npm i -g @buzuli/ops-tools
```

Both `ops-tools` and the alias `ops` will be exposed.

You can also invoke via `npx`:
```
npx @buzuli/ops-tools <sub-command>
```

## Usage
```
$ ops
ops <command>

Commands:
  ops alarms                                list configured cloudwatch alarms
  ops aws-health                            list aws health events
  ops aws-regions                           List out the AWS regions
  ops cf-log-fields                         CloudFlare log fields
  ops cf-stats                              CloudFlare stats
  ops couch-follow <url>                    follow a CouchDB change feed
  ops docker-tags <image>                   fetch the list of tags for an image
                                            from docker hub
  ops ec2-by-age                            list all AWS instances in a region
                                            by age
  ops ec2-can-run                           test if a particular EC2
                                            configuration will run
  ops ec2-find                              find an EC2 instance
  ops ec2-limits                            EC2 limits applied for this account
  ops ec2-new-docker-swarm                  create a docker swarm cluster
  ops ec2-state <instance-id>               Check or alter the state of an EC2
                                            instance
  ops ec2-uptimes                           list AWS instances in a region by
                                            uptime
  ops emr-cluster-info <cluster-id>         Get details on a single EMR cluster
  ops emr-clusters                          List out EMR clusters for a region
  ops http-get <url>                        simple http GET against a URL
  ops lambda-functions                      list out an account's AWS Lambda
                                            functions
  ops micro-monitor <url>                   check the status of a server running
                                            micro-monitor
  ops nsq-peek <topic>                      peek at messages in the named topic
  ops nsq-send <topic> <message>            send a message to an NSQ topic
  ops proxy <target-url>                    proxies to a remote URL and logs
                                            traffic for debugging
  ops replicate-ami <src-region> <src-ami>  replicate an AMI from one region to
                                            all others
  ops s3-buckets                            list out region S3 buckets
  ops s3-info <bucket> <key>                Get metadata for an S3 object
  ops s3-list <bucket>                      List keys in an s3 bucket
  ops site-poll <url>                       Check on the status of a site

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```

[travis-url]: https://travis-ci.org/joeledwards/ops-tools
[travis-image]: https://img.shields.io/travis/joeledwards/ops-tools/master.svg
[npm-url]: https://www.npmjs.com/package/@buzuli/ops-tools
[npm-image]: https://img.shields.io/npm/v/@buzuli/ops-tools.svg
