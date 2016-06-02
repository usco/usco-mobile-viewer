adapter_width = 16.3;
a_depth = 9.5;
a_height = 15;

difference() {
  translate([-adapter_width/2,0,0]) {
    cube([adapter_width,a_depth,a_height]);
    translate([adapter_width/2,a_depth,3]) rotate([90,0,0]) cylinder(r=3.0,h=2,center=true);
  }
  translate([0,0,-0.1]) cylinder(r=15/2,h=10.1);
  translate([0,a_depth,a_height-2]) #cube([20,3,4.1],center=true);
}

//base version
adapter_width = 16.3;
a_depth = 9.5;
a_height = 15;

module laser() {
  cylinder(r=15/2,h=90);
}

module laser_adapter(){
  cube([adapter_width,a_depth,a_height]);
  translate([adapter_width/2,a_depth,3]) rotate([90,0,0]) cylinder(r=3.0,h=2,center=true);
}

difference() {
  translate([-adapter_width/2,0,0]) laser_adapter();
  laser();
  translate([0,a_depth,a_height-2]) #cube([20,3,4],center=true);
}

// version with correct cuts
adapter_width = 16.3;
a_depth = 9.5;
a_height = 15;

module laser() {
  translate([0,0,-0.01])cylinder(r=15/2,h=90);
}

module laser_adapter(){
  cube([adapter_width,a_depth,a_height]);
  translate([adapter_width/2,a_depth,3]) rotate([90,0,0]) cylinder(r=3.0,h=2,center=true);
}

difference() {
  translate([-adapter_width/2,0,0]) laser_adapter();
  laser();
  translate([0,a_depth,a_height-2]) #cube([20,3,4.01],center=true);
}
