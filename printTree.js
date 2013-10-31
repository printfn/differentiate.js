var printTree = function (expr) {
	if (typeof expr === 'number' || typeof expr === 'string') {
		return expr;
	}

    var leftResult = printTree(expr.left);
    var rightResult = printTree(expr.right);
    
    var removeBrackets = function(str) {
        if (typeof str.indexOf !== 'undefined') {
            var idx = str.indexOf('(');
            if (idx != -1) {
                str = str.slice(0, idx) + str.slice(idx+1);
                idx = str.lastIndexOf(')');
                str = str.slice(0, idx) + str.slice(idx+1);
            }
        }
        return str;
    };

	if (expr.operator === 'functionCall')
		return '<div class="equation">' + leftResult + '(' + removeBrackets(rightResult) + ')</div>';

	return '<div class="equation">(' + leftResult + ' ' + expr.operator + ' ' + rightResult + ')</div>';
};