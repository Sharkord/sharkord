const checkEmptyMessage = (content: string): boolean => {

    // Matches strings that are either empty, contain only whitespace, or consist solely of empty or only space filled <p> tags (which currently is always the case for these message)
    const checkEmptyRegex = /^(?:\s*|<p>\s*<\/p>)$/;

    return checkEmptyRegex.test(content); 
}

export { checkEmptyMessage };