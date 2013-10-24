var printTree = function (tree) {
	if (typeof tree === 'number' || typeof tree === 'string') {
		return tree;
	}

	if (tree.tag === 'function') {
		return '<div class="equation">' + printTree(tree.left) + '(' + printTree(tree.right) + ')</div>';
	}

	if (tree.tag === 'addition') {
		return '<div class="equation">(' + printTree(tree.left) + ' + ' + printTree(tree.right) + ')</div>';
	}

	if (tree.tag === 'subtraction') {
		return '<div class="equation">(' + printTree(tree.left) + ' - ' + printTree(tree.right) + ')</div>';
	}

	if (tree.tag === 'multiplication') {
		return '<div class="equation">(' + printTree(tree.left) + ' * ' + printTree(tree.right) + ')</div>';
	}

	if (tree.tag === 'division') {
		return '<div class="equation">(' + printTree(tree.left) + ' / ' + printTree(tree.right) + ')</div>';
	}

	if (tree.tag === 'exponent') {
		return '<div class="equation">(' + printTree(tree.left) + ' ^ ' + printTree(tree.right) + ')</div>';
	}
};