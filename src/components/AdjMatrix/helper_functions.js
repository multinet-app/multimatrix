function splitCellNames(name) {
    //remove cell
    let cleanedCellName = name.replace('cell', '');
    let ids = cleanedCellName.split('_');
    return ['cell' + ids[0] + '_' + ids[1], 'cell' + ids[1] + '_' + ids[0]]
}