translate([5.9,0,0]){
difference() {
cube(size=[14,29,2],center=false);
cylinder(h=4,r=2.,$fn=200,center=false);
cylinder(h=4,r=10.,$fn=200,center=false);
cylinder(h=2.,r=1.,$fn=200,center=false);
}
} 
