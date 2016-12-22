# usco-mobile

[![GitHub version](https://badge.fury.io/gh/usco%2Fusco-mobile.svg)](https://badge.fury.io/gh/usco%2Fusco-mobile)
[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)
[![Build Status](https://travis-ci.org/usco/usco-mobile.svg)](https://travis-ci.org/usco/usco-mobile)
[![Dependency Status](https://david-dm.org/usco/usco-mobile.svg)](https://david-dm.org/usco/usco-mobile)
[![devDependency Status](https://david-dm.org/usco/usco-mobile/dev-status.svg)](https://david-dm.org/usco/usco-mobile#info=devDependencies)

<img src="https://raw.githubusercontent.com/usco/usco-mobile/master/screenshot.png" />


> Mobile app components for usco project

This is a small-ish (700 kb minified) mobile 3d file viewer component : minimal renderer + loading (stl only for now)
tested and working on Ios/Android (as part of the Ultimaker 3 app : [android](https://play.google.com/store/apps/details?id=com.ultimaker.control)
& [ios](https://itunes.apple.com/app/id1133171222))

- coded in es6
- uses streaming (node.js streams) to minimize memory consumption
- functional/ FRP oriented
- uses regl as functional WebGL framework

## Table of Contents

- [Background](#background)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Background

- uses the fantastic [regl](https://github.com/mikolalysenko/regl) (declarative stateless rendering)
- uses the also great [glsify](https://github.com/stackgl/glslify)
- and let us not forget [most](https://github.com/cujojs/most) for observables
- and many more

## Installation


```
npm install
```

### build distributable

```
npm run build
```

### launch dev server

```
npm run start-dev
```


## Usage

```
```

Because of the dependency on fetch + readeable streams , if not running this in
a recent Chrome/Chromium you will need a few polyfills :
these are also provided in the dist folder
- https://github.com/inexorabletash/text-encoding
- https://github.com/creatorrr/web-streams-polyfill


## Contribute

PRs accepted.

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.


## License

[The MIT License (MIT)](https://github.com/usco/usco-mobile/blob/master/LICENSE)
(unless specified otherwise)
