var printTree = function (expr) {
    var treeToString = function (expr) {
    	if (typeof expr === 'number')
    		return '' + expr;
        if (typeof expr === 'string')
            return expr;

        var leftResult = treeToString(expr.left);
        var rightResult = treeToString(expr.right);

        if (expr.operator === 'functionCall') {
            if (leftResult[0] === '|')
                leftResult = leftResult.substring(1);
            if (rightResult[0] === '|')
                rightResult = rightResult.substring(1);
            return '<div class="equation">' + leftResult + '(' + rightResult + ')</div>';
        }

        if (leftResult[0] === '|') {
            leftResult = '(' + leftResult.substring(1) + ')';
        }
        if (rightResult[0] === '|') {
            rightResult = '(' + rightResult.substring(1) + ')';
        }

        // pipe is removed later, means that brackets are required aroung returned expr
        return '|' + leftResult + ' ' + expr.operator + ' ' + rightResult;
    }

    return ('<div class="equation">'
        + treeToString(expr).replace(/^\|/, '')
            .replace(/\(/g, '<div class="equation">(')
            .replace(/\)/g, ')</div>')
        + '</div>');
};
