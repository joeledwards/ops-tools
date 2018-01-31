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

## Usage
```
$ ops
ops <command>

Commands:
  ops.js alarms                             list configured cloudwatch alarms
  ops.js aws-health                         list aws health events
  ops.js couch-offset <leader-url>          track a CouchDB and the offset of
                                            its follower(s)
  ops.js docker-tags <image>                fetch the list of tags for an image
                                            from docker hub
  ops.js ec2-by-age                         list all AWS instances in a region
                                            by age
  ops.js ec2-can-run                        test if a particular EC2
                                            configuration will run
  ops.js ec2-find                           find an EC2 instance
  ops.js ec2-uptimes                        list AWS instances in a region by
                                            uptime
  ops.js emr-cluster-info <cluster-id>      Get details on a single EMR cluster
  ops.js emr-clusters                       List out EMR clusters for a region
  ops.js http-get <url>                     simple http GET against a URL
  ops.js nsq-peek <topic>                   peek at messages in the named topic
  ops.js proxy <url>                        proxies to a remote URL and logs
                                            traffic for debugging
  ops.js replicate-ami <src-region>         replicate an AMI from one region to
  <src-ami>                                 all others
  ops.js s3-list <bucket>                   List keys in an s3 bucket
  ops.js site-poll <url>                    Check on the status of a site

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

[travis-url]: https://travis-ci.org/joeledwards/ops-tools
[travis-image]: https://img.shields.io/travis/joeledwards/ops-tools/master.svg
[npm-url]: https://www.npmjs.com/package/@buzuli/ops-tools
[npm-image]: https://img.shields.io/npm/v/@buzuli/ops-tools.svg
