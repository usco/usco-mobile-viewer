##References & documentation

  - All bison based , so read up http://dinosaur.compilertools.net/bison/bison_4.html
  - Current prototype parser based almost 100% on https://github.com/garyhodgson/openscad-openjscad-translator (thanks Gary !)

###Expressions

- named expressions: ie TOK_NUMBER, FOO returned from lexical grammar part
- expressions made of other expressions (note the $$) :
    expr: expr '+' expr   { $$ = $1 + $3; }


###Notes / issues:

double size for cuboid compared to openscad
