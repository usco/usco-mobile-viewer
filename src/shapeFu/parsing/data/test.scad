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
