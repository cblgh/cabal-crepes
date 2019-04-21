exports.clean = function clean (key) {
    return key.
        replace('cabal://', '').
        replace('cbl://', '').
        replace('dat://', '').
        replace(/\//g, '')
}
