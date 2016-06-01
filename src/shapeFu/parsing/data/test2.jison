/* description: Parses openscad to glsl/sdf. */

/* lexical grammar */
%lex
%options flex

%s cond_include cond_use cond_comment cond_string cond_import

D [0-9] //predefining decimals ?
E [Ee][+-]?{D}+ //predefining other ?

%%

include[ \t\r\n>]*"<"        %{ this.begin('cond_include'); %}
<cond_include>[^\t\r\n>]*"/" %{ yy.filepath = yytext; %}
<cond_include>[^\t\r\n>/]+   %{ yy.filename = yytext; %}
<cond_include>">"            %{  this.popState(); %}

<cond_string>"\""           %{
                                console.log('here')
                                this.popState();
                                yytext = stringcontents;
                                return 'TOK_STRING';
                            %}

{D}*\.{D}+{E}?              return 'TOK_NUMBER'
{D}+\.{D}*{E}?              return 'TOK_NUMBER'
{D}+{E}?                    return 'TOK_NUMBER'
"$"?[a-zA-Z0-9_]+           return 'TOK_ID'


"<="                        return 'LE'
">="                        return 'GE'
"=="                        return 'EQ'
"!="                        return 'NE'
"&&"                        return 'AND'
"||"                        return 'OR'

.                           return yytext;


/lex


/* operator associations and precedence */

%right '?' ':'
%left OR
%left AND
%left '<' LE GE '>'
%left EQ NE
%left '!' '+' '-'
%left '*' '/' '%'
%left '[' ']'
%left '.'

%start expr

%% /* language grammar */

expr:
    TOK_STRING
       {
          console.log('string',yytext) //$$ = new Expression(String($1));
       }
  |  TOK_NUMBER
      { console.log('number',yytext)}
  | '(' expr ')'
      { console.log('stuff in parens'); $$ = $2; }

  | TOK_ID '(' expr ')'
        {
          console.log('FOOO');
        }
  |   '[' optional_commas ']'
     {
         $$ = new Expression([]);
     }
  |   '[' vector_expr optional_commas ']'
     {
         $$ = $2;
         console.log('vector expr above')
     }


  |   expr '[' expr ']'
      {
      console.log('here')
          //$$ = new Expression();
          $$.type = '[]';
          //$$.children.push($1);
          //$$.children.push($3);
      }



  ;

optional_commas:
        ',' optional_commas
    ;

  vector_expr:
      expr
      {
          /*$$ = new Expression();
          */
          $$.type = 'V';
          //$$.children.push($1);
          console.log('vECTOOOR',$$, $1)
      }
  |   vector_expr ',' optional_commas expr
      {
          $$ = $1;
          //$$.children.push($4);
          console.log('vECTOOOR, with commas')
      }
  ;
%%
