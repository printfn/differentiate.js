var add = function (v1, v2) {
    var result = { operator: '+', left: v1, right: v2 };
    return result;
};
var sub = function (v1, v2) {
    var result = { operator: '-', left: v1, right: v2 };
    return result;
};
var mul = function (v1, v2) {
    var result = { operator: '*', left: v1, right: v2 };
    return result;
};
var div = function (v1, v2) {
    var result = { operator: '/', left: v1, right: v2 };
    return result;
};
var exp = function (v1, v2) {
    var result = { operator: '^', left: v1, right: v2 };
    return result;
};
var compareNodes = function (a, b) {
    if (typeof a === 'number' || typeof a === 'string' || typeof b === 'number' || typeof b === 'string')
        return a === b;
    if (typeof a.operator !== 'undefined' && typeof b.operator !== 'undefined')
        return compareNodes(a.operator, b.operator) && compareNodes(a.left, b.left) && compareNodes(a.right, b.right);
    throw "Unable to compare nodes!";
};
function differentiateExpression(expr) {
    if (typeof expr === 'number') {
        return 0;
    }
    if (typeof expr === 'string') {
        if (expr === 'x')
            return 1;
        return expr;
    }
    var v1 = expr.left;
    var v2 = expr.right;
    switch (expr.operator) {
        case '+': {
            var a = differentiateExpression(expr.left);
            var b = differentiateExpression(expr.right);
            return add(a, b);
        }
        case '-': {
            var a = differentiateExpression(expr.left);
            var b = differentiateExpression(expr.right);
            return sub(a, b);
        }
        case '*': {
            var v1d = differentiateExpression(v1);
            var v2d = differentiateExpression(v2);
            return add(mul(v1d, v2), mul(v1, v2d));
        }
        case '^': {
            //  f ^g  ' = f ^g *(f'  g /f +  g'  ln(f ))
            // (v1^v2)' = v1^v2*(v1d*v2/v1 + v2d*ln(v1))
            var v1d = differentiateExpression(v1);
            var v2d = differentiateExpression(v2);
            var l = exp(v1, v2);
            var r = add(div(mul(v1d, v2), v1), mul(v2d, {
                operator: 'functionCall',
                left: 'ln',
                right: v1
            }));
            var res = mul(l, r);
            return res;
        }
        case '/': {
            var v1d = differentiateExpression(v1);
            var v2d = differentiateExpression(v2);
            // (f/g)' -> (f'g - fg')/(g^2)
            var v1dv2 = mul(v1d, v2);
            var v1v2d = mul(v1, v2d);
            var subtractionResult = sub(v1dv2, v1v2d);
            var v2v2 = mul(v2, v2);
            var derivative = div(subtractionResult, v2v2);
            return derivative;
        }
        case 'functionCall': {
            if (typeof v1 !== 'string')
                throw "Invalid data structure";
            let v1d = v1 + `'`;
            var v2d = differentiateExpression(v2);
            switch (v1) {
                case 'sin':
                    return mul({ operator: 'functionCall', left: 'cos', right: v2 }, v2d);
                case 'cos':
                    return sub(0, mul({ operator: 'functionCall', left: 'sin', right: v2 }, v2d));
                case 'ln':
                    return div(v2d, v2); // chain rule
            }
            return mul({ operator: 'functionCall', left: v1d, right: v2 }, v2d);
        }
    }
    throw "No matching case in 'differentiate'";
}
var printTree = function (expr) {
    var treeToString = function (expr) {
        if (typeof expr === 'number')
            return expr.toString();
        if (typeof expr === 'string')
            return expr;
        var leftResult = treeToString(expr.left);
        var rightResult = treeToString(expr.right);
        if (expr.operator === 'functionCall') {
            if (leftResult[0] === '|')
                leftResult = leftResult.substring(1);
            if (rightResult[0] === '|')
                rightResult = rightResult.substring(1);
            return `${leftResult}(${rightResult})`;
        }
        if (leftResult[0] === '|') {
            leftResult = '(' + leftResult.substring(1) + ')';
        }
        if (rightResult[0] === '|') {
            rightResult = '(' + rightResult.substring(1) + ')';
        }
        // pipe is removed later, means that brackets are required around returned expr
        return `|${leftResult} ${expr.operator} ${rightResult}`;
    };
    return (treeToString(expr).replace(/^\|/, '')
        .replace(/\(/g, `(`)
        .replace(/\)/g, ')'));
};
var simplifyExpression = function (node) {
    if (typeof node === 'number' || typeof node === 'string')
        return node;
    if (typeof node.left !== 'undefined' && typeof node.right !== 'undefined') {
        node.left = simplifyExpression(node.left);
        node.right = simplifyExpression(node.right);
    }
    var add = function (left, right) {
        return simplifyExpression({ operator: '+', left: left, right: right });
    };
    var subtract = function (left, right) {
        return simplifyExpression({ operator: '-', left: left, right: right });
    };
    var multiply = function (left, right) {
        return simplifyExpression({ operator: '*', left: left, right: right });
    };
    var divide = function (left, right) {
        return simplifyExpression({ operator: '/', left: left, right: right });
    };
    var exponent = function (left, right) {
        return simplifyExpression({ operator: '^', left: left, right: right });
    };
    switch (node.operator) {
        case '+': {
            if (compareNodes(node.left, 0))
                return node.right;
            if (compareNodes(node.right, 0))
                return node.left;
            if (typeof node.left === 'number' && typeof node.right === 'number')
                return node.left + node.right;
            if (compareNodes(node.left, node.right))
                return multiply(2, node.left);
            if (typeof node.right === 'object') // (a+(a*b)) -> (a*(b+1))
                if (node.right.operator === '*')
                    if (compareNodes(node.right.left, node.left))
                        return multiply(node.left, add(node.right.right, 1));
            if (typeof node.right === 'object') // (a+(b*a)) -> (a*(b+1))
                if (node.right.operator === '*')
                    if (compareNodes(node.right.right, node.left))
                        return multiply(node.left, add(node.right.left, 1));
            if (typeof node.left === 'object') // ((a*b)+a) -> (a*(b+1))
                if (node.left.operator === '*')
                    if (compareNodes(node.left.left, node.right))
                        return multiply(node.right, add(node.left.right, 1));
            if (typeof node.left === 'object') // ((b*a)+a) -> (a*(b+1))
                if (node.left.operator === '*')
                    if (compareNodes(node.left.right, node.right))
                        return multiply(node.right, add(node.left.left, 1));
            // ((a*x)+(b*x)) -> (a+b)*x)
            if (typeof node.left === 'object' && node.left.operator === '*')
                if (typeof node.right === 'object' && node.right.operator === '*')
                    if (compareNodes(node.left.right, node.right.right))
                        return multiply(add(node.left.left, node.right.left), node.left.right);
            return node;
        }
        case '-': {
            if (compareNodes(node.right, 0))
                return node.left;
            if (typeof node.left === 'number' && typeof node.right === 'number')
                return node.left - node.right;
            if (compareNodes(node.left, node.right))
                return 0;
            return node;
        }
        case '*': {
            if (compareNodes(node.left, 0))
                return 0;
            if (compareNodes(node.right, 0))
                return 0;
            if (compareNodes(node.left, 1))
                return node.right;
            if (compareNodes(node.right, 1))
                return node.left;
            if (typeof node.left === 'number' && typeof node.right === 'number')
                return node.left * node.right;
            if (typeof node.right === 'number' && typeof node.left !== 'number')
                return multiply(node.right, node.left);
            if (typeof node.right === 'object') // (a*(a^b)) -> a^(b+1)
                if (node.right.operator === '*')
                    if (typeof node.left === 'number' && typeof node.right.left === 'number')
                        return multiply(node.left * node.right.left, node.right.right);
            if (compareNodes(node.left, node.right))
                return simplifyExpression({ operator: '^', left: node.left, right: 2 });
            if (typeof node.right === 'object') // (a*(a^b)) -> a^(b+1)
                if (node.right.operator === '^')
                    if (compareNodes(node.right.left, node.left))
                        return exponent(node.left, add(node.right.right, 1));
            if (typeof node.left === 'object') // ((a^b)*a) -> a^(b+1)
                if (node.left.operator === '^')
                    if (compareNodes(node.left.left, node.right))
                        return exponent(node.right, add(node.left.right, 1));
            if (typeof node.right === 'object') // (a*(a*b)) -> (a^2)*b
                if (node.right.operator === '*')
                    if (compareNodes(node.right.left, node.left))
                        return multiply(node.right.right, exponent(node.left, 2));
            if (typeof node.left === 'object') // ((b*a)*a) -> b*(a^2)
                if (node.left.operator === '*')
                    if (compareNodes(node.left.right, node.right))
                        return multiply(node.left.left, exponent(node.right, 2));
            if (typeof node.right === 'object') // (a*((a^n)*b)) -> b*(a^(n+1))
                if (node.right.operator === '*')
                    if (typeof node.right.left === 'object')
                        if (node.right.left.operator === '^')
                            if (compareNodes(node.right.left.left, node.left))
                                return multiply(node.right.right, exponent(node.left, add(node.right.left.right, 1)));
            if (typeof node.left === 'object') // ((a^b)*(c/a)) -> c*(a^(b-1))
                if (node.left.operator === '^')
                    if (typeof node.right === 'object') // ((a^b)*(c/a)) -> c*(a^(b-1))
                        if (node.right.operator === '/')
                            if (compareNodes(node.left.left, node.right.right))
                                return multiply(node.right.left, exponent(node.left.left, subtract(node.left.right, 1)));
            if (typeof node.left === 'object' && typeof node.right === 'string') // (3*(x^a))*x -> 3*(x^(a+1))
                if (node.left.operator == '*' && typeof node.left.left === 'number')
                    if (typeof node.left.right === 'object' && node.left.right.left === node.right)
                        if (typeof node.left.right.right === 'number' && node.left.right.operator === '^')
                            return multiply(node.left.left, exponent(node.right, add(1, node.left.right.right)));
            return node;
        }
        case '/': {
            if (compareNodes(node.left, 0))
                return 0;
            if (compareNodes(node.right, 0))
                return NaN;
            if (compareNodes(node.right, 1))
                return node.left;
            if (typeof node.left === 'number' && typeof node.right === 'number')
                return node.left / node.right;
            if (compareNodes(node.left, node.right))
                return 1;
            return node;
        }
        case '^': {
            if (compareNodes(node.left, 0))
                return 0;
            if (compareNodes(node.right, 0))
                return 1;
            if (compareNodes(node.left, 1))
                return 1;
            if (compareNodes(node.right, 1))
                return node.left;
            if (typeof node.left === 'number' && typeof node.right === 'number')
                return Math.pow(node.left, node.right);
            return node;
        }
        case 'functionCall': {
            return node;
        }
    }
    throw "No matching case in 'simplify'";
};
function recalculate() {
    var outputElement = document.getElementById('output');
    try {
        var differentiate = function () {
            var startTime = new Date().getTime(); // ms since 1970
            var input = document.getElementById('functionTextBox').value;
            // empty input
            if (input.trim().length == 0) {
                return '';
            }
            var result = parser.parse(input);
            var addPrimeToFunction = false;
            if (document.getElementById('differentiateCheckbox').checked) {
                result = differentiateExpression(result);
                addPrimeToFunction = true;
            }
            if (document.getElementById('simplifyCheckbox').checked) {
                result = simplifyExpression(result);
            }
            result = printTree(result);
            var endTime = new Date().getTime();
            var duration = endTime - startTime;
            var primeToAdd = addPrimeToFunction ? `'` : ``;
            return `f${primeToAdd}(x) = ${result}<br><br>${duration}ms`;
        };
        outputElement.innerHTML = differentiate();
        outputElement.classList.remove('output-error');
    }
    catch (err) {
        outputElement.classList.add('output-error');
        var errorMessage = 'Invalid input.';
        if (err.message) {
            errorMessage += ' ' + err.message;
        }
        else if (typeof err === 'string') {
            errorMessage += ' ' + err;
        }
        outputElement.innerHTML = errorMessage;
    }
}
function test(expr, expected) {
    try {
        var result = parser.parse(expr);
        result = differentiateExpression(result);
        result = simplifyExpression(result);
        const parsedExpected = parser.parse(expected);
        if (!compareNodes(result, parsedExpected)) {
            throw `Expected: ${printTree(parsedExpected)}<br>Actual: ${printTree(result)}`;
        }
    }
    catch (err) {
        if (err.message) {
            return err.message;
        }
        else if (typeof err === 'string') {
            return err;
        }
        return 'Unknown Error!';
    }
    return null;
}
function runTests() {
    var testCases = [
        ['x', '1'],
        ['x^2', '2x'],
        ['x^3', '3x^2'],
        ['x^10', '10x^9'],
        ['xx', '2x'],
        ['xxx', '3x^2'],
        ['xxxxx*xxxxx', '10x^9'],
        ['0', '0'],
        ['1', '0'],
        ['0x-451', '0'],
        ['sin(x)', 'cos(x)'],
        ['cos(x)', '0-sin(x)'],
        ['ln(x)', '1/x'],
        ['1+x+x^2', '1+2x'],
        ['sin(x^2)', 'cos(x^2)*(2*x)'],
        ['x * x + sin ( x )', '2x+cos(x)']
        //['x^(-4)', '-4x^(-3)'], // TODO: implement parsing prefix - first
    ];
    var testOutputElement = document.getElementById('testOutput');
    testOutputElement.innerHTML = ``;
    for (let i in testCases) {
        let res = test(testCases[i][0], testCases[i][1]);
        if (res) {
            testOutputElement.innerHTML += `Test ${parseInt(i, 10) + 1}: ${res}<br>`;
        }
    }
    testOutputElement.innerHTML += `Completed ${testCases.length} tests`;
}
