# ops-tools
[![Build Status][travis-image]][travis-url]
[![NPM version][npm-image]][npm-url]

A suite of tools to help @buzuli be more productive at DevOps.

## Dependencies
- Node.js >=8.0.0

## Installing
```
$ npm i -g @buzuli/ops-tools
```

Both `ops-tools` and the alias `ops` will be exposed.

You can also invoke via `npx`:
```
npx @buzuli/ops-tools <sub-command>
```

## Configuration

### AWS
For AWS commands (`ec2-*`, `s3-*`, `emr-*`, etc.):
- region - `AWS_REGION` | `AWS_DEFAULT_REGION`
- key id - `AWS_ACCESS_KEY` | `AWS_ACCESS_KEY_ID`
- secret key - `AWS_SECRET_KEY` | `AWS_SECRET_ACCESS_KEY`

### Cloudflare
For cloudflare commands (`cf-*`):
- zone - `CLOUDFLARE_ZONE`
- email - `CLOUDFLARE_EMAIL`
- api key - `CLOUDFLARE_API_KEY`

### Color
Uses `@buzuli/color`, so you can adjust the color scheme using its config options:
- `BUZULI_COLOR_LIGHT=yes` - for light terminal backgrounds
- `BUZULI_COLOR_DARK=yes` - for dark terminal backgrounds
- individual colors can also be configured (https://www.npmjs.com/package/@buzuli/color#configuration)

## Usage
```
$ ops
ops <command>

Commands:
  ops acm-import <pem-cert> <private-key>  Imports a pem-format cert into ACM
  ops acm-info <arn>                       show details for a certificate
  ops acm-list                             list all ACM certificates
  ops alarms                               list configured cloudwatch alarms
  ops ami-list                             list AMIs in the current region
  ops ami-publish <region> <ami>           make the identified AMI public
  ops ami-replicate <region> <ami>         replicate an AMI from one region to
                                           all others
  ops ami-unpublish <region> <ami>         make the identified AMI private
  ops aws-health                           list aws health events
  ops aws-regions                          List out the AWS regions
  ops cf-log-fields                        CloudFlare log fields
  ops cf-stats                             CloudFlare stats
  ops couch-follow <url>                   follow a CouchDB change feed
  ops docker-tags <image>                  fetch the list of tags for an image
                                           from docker hub
  ops ec2-by-age                           list all AWS instances in a region by
                                           age
  ops ec2-can-run                          test if a particular EC2
                                           configuration will run
  ops ec2-find                             find an EC2 instance
  ops ec2-ips                              List elastic IPs for the region
  ops ec2-limits                           EC2 limits applied for this account
  ops ec2-new-docker-swarm                 create a docker swarm cluster
  ops ec2-state <instance>                 Check or alter the state of an EC2
                                           instance
  ops ec2-uptimes                          list AWS instances in a region by
                                           uptime
  ops emr-cluster-info <cluster>           Get details on a single EMR cluster
  ops emr-clusters                         List out EMR clusters for a region
  ops http-get <url>                       simple http GET against a URL
  ops lambda-functions                     list out an account's AWS Lambda
                                           functions
  ops micro-monitor <url>                  check the status of a server running
                                           micro-monitor
  ops nsq-peek <topic>                     peek at messages in the named topic
  ops nsq-send <topic> <message>           send a message to an NSQ topic
  ops package-versions <pkg>               provide a summary of package version
                                           info
  ops proxy <url>                          proxies to a remote URL and logs
                                           traffic for debugging
  ops s3-buckets                           list out region S3 buckets
  ops s3-info <bucket> <key>               Get metadata for an S3 object
  ops s3-list <bucket>                     List keys in an s3 bucket
  ops site-poll <url>                      Check on the status of a site

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```

[travis-url]: https://travis-ci.org/joeledwards/ops-tools
[travis-image]: https://img.shields.io/travis/joeledwards/ops-tools/master.svg
[npm-url]: https://www.npmjs.com/package/@buzuli/ops-tools
[npm-image]: https://img.shields.io/npm/v/@buzuli/ops-tools.svg
