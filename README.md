# usco-mobile

[![GitHub version](https://badge.fury.io/gh/usco%2Fusco-mobile.svg)](https://badge.fury.io/gh/usco%2Fusco-mobile)
[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)
[![Build Status](https://travis-ci.org/usco/usco-mobile.svg)](https://travis-ci.org/usco/usco-mobile)
[![Dependency Status](https://david-dm.org/usco/usco-mobile.svg)](https://david-dm.org/usco/usco-mobile)
[![devDependency Status](https://david-dm.org/usco/usco-mobile/dev-status.svg)](https://david-dm.org/usco/usco-mobile#info=devDependencies)


> Mobile app components for usco project

This is the mobile app component for Jam/usco : minimal renderer + loading (stl only for now)

## Table of Contents

- [Background](#background)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Background

- uses the fantastic [regl](https://github.com/mikolalysenko/regl) (declarative stateless rendering)
- uses the also great [glsify(https://github.com/stackgl/glslify)
- and let us not forget [most](https://github.com/cujojs/most) for observables
- and many more


### This needs to be able to

- displays meshes, from raw hashes of Float32Array (positions, normals) => DONE
- display meshes given lots of 'meta' data : ie json object containing transforms, colors, etc IN , render OUT => DONE
- have identical controls (camera controls) *MEDIUM* => DONE
- replicate (need not match 100%) the 'grid' *MEDIUM* => DONE
- do 'picking' *MEDIUM* => DONE
- work server side  *EASY* => DONE, IN COLOR
- lines (for gcode etc) *TRIVIAL* : just use primitive:'lines' when rendering => DONE
- handle object hiearchies (ie transform hierarchies) at least in a basic manner *MEDIUM*
- replicate (need not match 100%) object transform controls  *VERY HARD*
- object outlines (hopefully BETTER than the current ones) *HARD*
- shadows (less important, waaay harder than all the rest ?) *HARD* => DONE
- shading /visual quality *MEDIUM*  
- what to do with all 'visual helpers' ? *HARD*

###extras infos:
- good performance (hopefully !)
- functional
- data driven
- close to the metal : no more going through hoops (three.js)
- makes it easier to implement advanced rendering (npr, pbr)
- small-ish size


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
