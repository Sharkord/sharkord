const checkEmptyMessage = (content: string): boolean => {

    const checkEmptyRegex = /^(?:\s*|<p>\s*<\/p>)$/;

    return checkEmptyRegex.test(content); 
}

export { checkEmptyMessage };