
/* description: Parses openscad to openjscad. */

/* lexical grammar */

%lex

%options flex


%s cond_include cond_use cond_comment cond_string cond_import

D [0-9]
E [Ee][+-]?{D}+

%%

/* Note: use and include statements here are ignored. Instead they are preprocessed. */
include[ \t\r\n>]*"<"        %{ this.begin('cond_include'); %}
<cond_include>[^\t\r\n>]*"/" %{ yy.filepath = yytext; %}
<cond_include>[^\t\r\n>/]+   %{ yy.filename = yytext; %}
<cond_include>">"            %{  this.popState(); %}

use[ \t\r\n>]*"<"           %{ this.begin('cond_use');%}
<cond_use>[^\t\r\n>]+       %{ yy.filename = yytext; %}
<cond_use>">"               %{ this.popState(); %}

"module"                    return 'TOK_MODULE'
"function"                  return 'TOK_FUNCTION'
"if"                        return 'TOK_IF'
"else"                      return 'TOK_ELSE'
"true"                      return 'TOK_TRUE'
"false"                     return 'TOK_FALSE'
"undef"                     return 'TOK_UNDEF'

<cond_string>"\\t"          %{ stringcontents += '    ';  %}
<cond_string>"\\n"          %{ stringcontents += '\n';  %}
<cond_string>"\\\""         %{ stringcontents += '\"';  %}
<cond_string>"\\r"          %{ stringcontents += '\r';  %}
<cond_string>"\\\\"         %{ stringcontents += '\\';  %}

<cond_string>"\\0"          %{ stringcontents += '\0';  %}
<cond_string>"\\a"          %{ stringcontents += '\a';  %}
<cond_string>"\\b"          %{ stringcontents += '\b';  %}
<cond_string>"\\t"          %{ stringcontents += '\t';  %}
<cond_string>"\\n"          %{ stringcontents += '\n';  %}
<cond_string>"\\v"          %{ stringcontents += '\v';  %}
<cond_string>"\\f"          %{ stringcontents += '\f';  %}
<cond_string>"\\e"          %{ stringcontents += '\e';  %}
<cond_string>[^\\\n\"]+     %{ /*"*/
                                stringcontents += yytext;
                            %}
<cond_string>"\""           %{
                                this.popState();
                                yytext = stringcontents;
                                return 'TOK_STRING';
                            %}
[\"]                        %{ /*"*/
                                this.begin('cond_string');
                                stringcontents = "";
                            %}

[\n]                        /* Ignore */
[\r\t ]                     /* Ignore */
\/\/[^\n]*\n?               /* Ignore */
\/\*.+\*\/                  /* Ignore Note: multi-line comments are removed via a preparse regex. */

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

%start program

%% /* language grammar */

program:
        input
        {
            // FIXME return ext.processModule(yy);
            yy.settings.processModule(yy);
        }
    ;


input:
        /* empty */
    |   input statement
    ;

inner_input:
        /* empty */
    |   inner_input statement
    ;

statement:
        statement_begin statement_end
    ;

statement_begin:
        /*empty*/
    |   TOK_MODULE TOK_ID '(' arguments_decl optional_commas ')'
        {
            yy.settings.stashModule($2, $4.argnames, $4.argexpr);
            delete $4;
        }
    ;

statement_end:
        ';'
        {
        }
    |   '{' inner_input '}'
        {
            yy.settings.popModule();
            console.log('popModule')
        }
    |   module_instantiation
        {
            yy.settings.addModuleChild($1)
        }
    |   TOK_ID '=' expr ';'
        {
            yy.settings.addModuleAssignmentVar($1, $3);
        }
    |   TOK_FUNCTION TOK_ID '(' arguments_decl optional_commas ')' '=' expr ';'
        {
            yy.settings.addModuleFunction($2, $8, $4.argnames, $4.argexpr);
            delete $4;
        }
    |   BR
    ;

children_instantiation:
        module_instantiation
        {
            $$ = { t:'moduleInstantiation', children:[]}
            if ($1) {
                $$.children.push($1);
            }
        }
    |   '{' module_instantiation_list '}'
        {
            $$ = $2;
        }
    ;


if_statement:
        TOK_IF '(' expr ')' children_instantiation
        {
          console.log('here too')
            $$ = new IfElseModuleInstantiation();
            $$.argnames.push("");
            $$.argexpr.push($3);

            if ($$) {
                $$.children = $5.children;
            } else {
                for (var i = 0; i < $5.children.size(); i++)
                    delete $5.children[i];
            }
            delete $5;
        }
    ;

ifelse_statement:
        if_statement
        {
            $$ = $1;
        }
    |   if_statement TOK_ELSE children_instantiation
        {
            $$ = $1;
            if ($$) {
                $$.else_children = $3.children;
            } else {
                for (var i = 0; i < $3.children.size(); i++)
                    delete $3.children[i];
            }
            delete $3;
        }
    ;

module_instantiation:
        single_module_instantiation ';'
        {
            $$ = $1;
        }
    |   single_module_instantiation children_instantiation
        {
            $$ = $1;
            if ($$) {
                $$.children = $2.children;
            } else {
                for (var i = 0; i < $2.children.length; i++)
                delete $2.children[i];
            }
            delete $2;
        }
    |
        ifelse_statement
        {
            $$ = $1;
        }
    ;

module_instantiation_list:
        /* empty */
        {
            $$ = { t:'moduleInstantiation', children:[]}
        }
    |   module_instantiation_list module_instantiation
        {
            $$ = $1;
            if ($$) {
                if ($2) {
                    $$.children.push($2);
                }
            } else {
                delete $2;
            }
        }
    ;

single_module_instantiation:
        TOK_ID '(' arguments_call ')'
        {
            $$ = { t:'moduleInstantiation', children:[]}
            $$.name = $1;
            $$.argnames = $3.argnames;
            $$.argexpr = $3.argexpr;
            delete $3;
        }
    |   '!' single_module_instantiation
        {
            $$ = $2;
            if ($$) {
                $$.tag_root = true;
            }
        }
    |   '#' single_module_instantiation
        {
            $$ = $2;
            if ($$) {
                $$.tag_highlight = true;
            }
        }
    |   '%' single_module_instantiation
        {
            /* - NOTE: Currently unimplemented, therefore not displaying parts marked with %
                $$ = $2;
                if ($$) {
                    $$.tag_background = true;
                }
            */
            delete $2;
            $$ = undefined;
        }
    |   '*' single_module_instantiation
        {
            delete $2;
            $$ = undefined;
        }
    ;

expr:
        TOK_TRUE
        {
            $$ = new Expression(true);
        }
    |   TOK_FALSE
        {
            $$ = new Expression(false);
        }
    |   TOK_UNDEF
        {
            $$ = new Expression(undefined);
        }
    |   TOK_ID
        {
            $$ = {children:[]}
            $$.type = "L";
            $$.var_name = $1;
        }
    |   expr '.' TOK_ID
        {
            $$ = {children:[]}
            $$.type = "N";
            $$.children.push($1);
            $$.var_name = $3;
        }
    |   TOK_STRING
        {
            $$ = new Expression(String($1));
        }
    |   TOK_NUMBER
        {
            //$$ =new Expression(Number($1));
            //console.log('number',$1)
            $$ = parseInt($1)
        }
    |   '[' expr ':' expr ']'
        {
            var e_one = new Expression(1.0);
            $$ = {children:[]}
            $$.type = "R";
            $$.children.push($2);
            $$.children.push(e_one);
            $$.children.push($4);
        }
    |   '[' expr ':' expr ':' expr ']'
        {
            $$ = {children:[]}
            $$.type = "R";
            $$.children.push($2);
            $$.children.push($4);
            $$.children.push($6);
        }
    |   '[' optional_commas ']'
        {
            $$ = new Expression([]);
        }
    |   '[' vector_expr optional_commas ']'
        {
            $$ = $2;
        }
    |   expr '*' expr
        {
            $$ = {children:[]}
            $$.type = '*';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr '/' expr
        {
            $$ = {children:[]}
            $$.type = '/';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr '%' expr
        {
            $$ = {children:[]}
            $$.type = '%';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr '+' expr
        {
            $$ = {children:[]}
            $$.type = '+';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr '-' expr
        {
            $$ = {children:[]}
            $$.type = '-';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr '<' expr
        {
            $$ = {children:[]}
            $$.type = '<';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr LE expr
        {
            $$ = {children:[]}
            $$.type = '<=';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr EQ expr
        {
            $$ = {children:[]}
            $$.type = '==';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr NE expr
        {
            $$ = {children:[]}
            $$.type = '!=';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr GE expr
        {
            $$ = {children:[]}
            $$.type = '>=';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr '>' expr
        {
            $$ = {children:[]}
            $$.type = '>';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr AND expr
        {
            $$ = {children:[]}
            $$.type = '&&';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   expr OR expr
        {
            $$ = {children:[]}
            $$.type = '||';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   '+' expr
        {
            $$ = $2;
        }
    |   '-' expr
        {
            $$ = {children:[]}
            $$.type = 'I';
            $$.children.push($2);
        }
    |   '!' expr
        {
            $$ = {children:[]}
            $$.type = '!';
            $$.children.push($2);
        }
    |   '(' expr ')'
            { $$ = $2; }
    |   expr '?' expr ':' expr
        {
            $$ = {children:[]}
            $$.type = '?:';
            $$.children.push($1);
            $$.children.push($3);
            $$.children.push($5);
        }
    |   expr '[' expr ']'
        {
            $$ = {children:[]}
            $$.type = '[]';
            $$.children.push($1);
            $$.children.push($3);
        }
    |   TOK_ID '(' arguments_call ')'
        {
            $$ = {children:[]}
            $$.type = 'F';
            $$.call_funcname = $1;
            $$.call_argnames = $3.argnames;
            $$.children = $3.argexpr;
            delete $3;
        }
    ;

optional_commas:
        ',' optional_commas
    |
    ;

vector_expr:
        expr
        {
            $$ = {children:[]}
            $$.type = 'V';
            $$.children.push($1);
            //console.log('vector expr', $$, $1)
        }
    |   vector_expr ',' optional_commas expr
        {
            $$ = $1;
            $$.children.push($4);
            //console.log('vector sub', $$, $4)
        }
    ;

arguments_decl:
        /* empty */
        {
            $$ = {argnames:[], argexpr:[]};
        }
    |   argument_decl
        {
          console.log('here')
            $$ = {argnames:[], argexpr:[]};
            $$.argnames.push($1.argname);
            $$.argexpr.push($1.argexpr);
            delete $1;
        }
    |   arguments_decl ',' optional_commas argument_decl
        {
          console.log('here 2')
            $$ = $1;
            $$.argnames.push($4.argname);
            $$.argexpr.push($4.argexpr);
            delete $4;
        }
    ;

argument_decl:
        TOK_ID
        {
            $$ = {argname:undefined, argexpr:undefined};
            $$.argname = $1;
            $$.argexpr = undefined;
        }
    |   TOK_ID '=' expr
        {
            $$ = {argname:undefined, argexpr:undefined};
            $$.argname = $1;
            $$.argexpr = $3;
        }
    ;

arguments_call:
        /* empty */
        {
            $$ = {argnames:[], argexpr:[]};
        }
    |   argument_call
        {

            $$ = {argnames:[], argexpr:[]};

            $$.argnames.push($1.argname);
            $$.argexpr.push($1.argexpr);
            delete $1;
        }
    |   arguments_call ',' optional_commas argument_call
        {
          console.log('here 4', $$, $4)
            $$ = $1;
            $$.argnames.push($4.argname);
            $$.argexpr.push($4.argexpr);
            delete $4;
        }
    ;

argument_call:
        expr
        {
            $$ = {argname:undefined, argexpr:undefined};
            $$.argexpr = $1;
        }
    |   TOK_ID '=' expr
        {
            $$ = {argname:undefined, argexpr:undefined};
            $$.argname = $1;
            $$.argexpr = $3;
        }
    ;

%%
