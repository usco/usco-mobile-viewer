//https://www.youmagine.com/designs/megatronics-v3-rev-f-mounting-plate-for-p3steel
// megatronics_v3_rev_f_mounting_plate_for_p3steel.scad

const float PI = 3.14159265359;

#pragma glslify: sdBox = require('../primitives/box.frag')
#pragma glslify: sdCyl = require('../primitives/coneSection.frag')

#pragma glslify: opS = require('../operations/subtract.frag')
#pragma glslify: opU = require('../operations/union.frag')

/*$fn=100;

difference(){
  union(){
    // base dimensions of the pcb
    difference(){
      cube([111.5,91.3,3]);
      // hex holes removed for material savings
      translate([-5,0,0]){
        translate([10,10,-.1]){
          for(a=[17,34,51,68,85]){
            for(b=[0,10,20,30,40,50,60,70]){
              translate([a,b,0]){
                cylinder($fn=6,h=5,r=5);
              }
            }
          }
        }
        translate([18.5,15,-.1]){
          for(a=[0,17,34,51,68,85]){
            for(b=[0,10,20,30,40,50,60]){
              translate([a,b,0]){
                cylinder($fn=6,h=5,r=5);
              }
            }
          }
        }
      }
    }

    // cylindrical support around each hole (pcb holes)
    translate([2.85,3,0]){
      cylinder(h=5,r=7);
    }
    translate([3.55,88.5,0]){
      cylinder(h=5,r=7);
    }
    translate([74.85,54.1,0]){
      cylinder(h=5,r=7);
    }
    translate([108.05,3,0]){
      cylinder(h=5,r=7);
    }
    translate([108.35,89,0]){
      cylinder(h=5,r=7);
    }

    // cylindrical support around each hole (p3steel frame holes)
    translate([55.45,8.15,0]){
      cylinder(h=5,r=7);
    }
    translate([55.45,83.15,0]){
      cylinder(h=5,r=7);
    }

  }

  // the pcb holes
  translate([2.85,3,-.1]){
    cylinder(h=5.2,r=1.7);
  }
  translate([3.55,88.5,-.1]){
    cylinder(h=5.2,r=1.7);
  }
  translate([74.85,54.1,-.1]){
    cylinder(h=5.2,r=1.7);
  }
  translate([108.05,3,-.1]){
    cylinder(h=5.2,r=1.7);
  }
  translate([108.35,89,-.1]){
    cylinder(h=5.2,r=1.7);
  }

  // hex holes for nuts
  translate([2.85,3,-.1]){
    cylinder($fn=6,h=3,r=3.5);
  }
  translate([3.55,88.5,-.1]){
    cylinder($fn=6,h=3,r=3.5);
  }
  translate([74.85,54.1,-.1]){
    cylinder($fn=6,h=3,r=3.5);
  }
  translate([108.05,3,-.1]){
    cylinder($fn=6,h=3,r=3.5);
  }
  translate([108.35,89,-.1]){
    cylinder($fn=6,h=3,r=3.5);
  }

  // p3steel frame holes
  translate([55.45,8.15,-.1]){
    cylinder(h=5.2,r=1.7);
  }
  translate([55.45,83.15,-.1]){
    cylinder(h=5.2,r=1.7);
  }

  // hex holes for p3steel frame holes
  translate([55.45,8.15,2]){
    cylinder($fn=6,h=3.1,r=3.5);
  }
  translate([55.45,83.15,2]){
    cylinder($fn=6,h=3.1,r=3.5);
  }

}*/
