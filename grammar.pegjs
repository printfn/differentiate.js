start
  = additiveExpression

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
  = head:multiplicativeExpression
    tail:(_ additiveOperator _ multiplicativeExpression)* {
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
  = head:exponentialExpression
    tail:(_ multiplicativeOperator _ exponentialExpression)* {
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
  = head:unaryExpression _ op:exponentialOperator _ tail:exponentialExpression {
      return {
          operator: op,
          left:     head,
          right:    tail
      };
    }
  / unaryExpression

unaryExpression
  = integer
  / "x"
  / functionCallExpression
  / "(" _ expr:additiveExpression _ ")" _
    { return expr; }

functionCallExpression
  = head:identifier _ "(" _ tail:additiveExpression _ ")"
    { return {
          operator: "functionCall",
          left:     head,
          right:    tail
      };
    }

identifier = name:[a-zA-Z]+ { return name.join(""); }

integer "integer"
  = digits:[0-9]+ { return parseInt(digits.join("")); }

_ = whitespace / ""

whitespace "whitespace"
  = [\r\n\t\v\f \u00A0\uFEFF]