function splitCellNames(name) {
    //remove cell
    let cleanedCellName = name.replace('cell', '');
    let ids = cleanedCellName.split('_');
    return ['cell' + ids[0] + '_' + ids[1], 'cell' + ids[1] + '_' + ids[0]]
}


function searchForNode(theForm) {
    var reason = "";
    reason += validateName(theForm.name);
    reason += validatePhone(theForm.phone);
    reason += validateEmail(theForm.emaile);

    if (reason != "") {
        alert("Some fields need correction:\n" + reason);
    } else {
        simpleCart.checkout();
    }
    return false;
}