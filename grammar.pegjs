start
  = _ expr:additiveExpression _ { return expr; }

additiveOperator
  = "+"
  / "-"

multiplicativeOperator
  = "*"
  / "/"
  / ""

exponentialOperator
  = "^"

additiveExpression
  = _ head:multiplicativeExpression
    _ tail:(_ additiveOperator _ multiplicativeExpression)* _ {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        result = {
          operator: tail[i][1],
          left:     result,
          right:    tail[i][3]
        };
      }
      return result;
    }

multiplicativeExpression
  = _ head:exponentialExpression
    _ tail:(_ multiplicativeOperator _ exponentialExpression)* _ {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        var operator = tail[i][1];
        if (operator == "") {
          operator = "*"
        }
        result = {
          operator: operator,
          left:     result,
          right:    tail[i][3]
        };
      }
      return result;
    }

exponentialExpression
  = _ head:unaryExpression _ op:exponentialOperator _ tail:exponentialExpression _ {
      return {
          operator: op,
          left:     head,
          right:    tail
      };
    }
  / _ expr:unaryExpression _ { return expr; }

unaryExpression
  = _ i:integer _                           { return i; }
  / _ x:"x" _                               { return x; }
  / _ f:functionCallExpression _            { return f; }
  / _ "(" _ expr:additiveExpression _ ")" _ { return expr; }

functionCallExpression
  = head:identifier _ "(" _ tail:additiveExpression _ ")"
    { return {
          operator: "functionCall",
          left:     head,
          right:    tail
      };
    }

identifier = _ name:[a-zA-Z]+ _ { return name.join(""); }

integer "integer"
  = _ digits:[0-9]+ _ { return parseInt(digits.join("")); }

_ = whitespace / ""

whitespace "whitespace"
  = [\r\n\t\v\f \u00A0\uFEFF]+
