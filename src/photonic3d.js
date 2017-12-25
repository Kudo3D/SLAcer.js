/* global $ */

// Photonic3D Modifications and Features to SLAcer

// Utils
function findPythagoreanC(a, b) {
    return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
}

function setPrinterCalibrationSettings(printer) {
    let slicingProfile = printer.configuration.slicingProfile;
    let monitorDriverConfig = printer.configuration.machineConfig.MonitorDriverConfig;
    let dotsPermmX = slicingProfile.DotsPermmX;
    let dotsPermmY = slicingProfile.DotsPermmY;
    let dotsPermmXYAverage = (dotsPermmX + dotsPermmY) / 2;
    // Uncomment when not in testing anymore
    // if (Math.abs(dotsPermmX - dotsPermmY) >= 0.1) {
    //     return true;
    // }
    let buildVolXmm = Math.round(monitorDriverConfig.DLP_X_Res / dotsPermmXYAverage);
    let buildVolYmm = Math.round(monitorDriverConfig.DLP_Y_Res / dotsPermmXYAverage);
    let diagonalMM = Math.round(findPythagoreanC(buildVolXmm, buildVolYmm));

    $slicerSpeedYes[0].checked = true;
    $slicerSpeedNo[0].checked = false;
    $slicerSpeedDelay.val(0);
    // Convert mm to microns
    $slicerLayerHeight.val(slicingProfile.InkConfig[slicingProfile.selectedInkConfigIndex].SliceHeight * 1000);

    settings.set('slicer.speed', $slicerSpeedYes[0].checked);
    settings.set('slicer.speedDelay', $slicerSpeedDelay.val());
    settings.set('slicer.layers.height', $slicerLayerHeight.val());
    
    $buildVolumeX.val(buildVolXmm);
    $buildVolumeY.val(buildVolYmm);
    $buildVolumeZ.val(printer.configuration.machineConfig.PlatformZSize);
    updateBuildVolumeSettings();
    
    let unit = settings.get('screen.diagonal.unit');
    let convert = unit == 'in';
    
    $screenDiagonalSize.val(convert ? parseUnit(diagonalMM, unit) : diagonalMM);
    $screenWidth.val(monitorDriverConfig.DLP_X_Res);
    $screenHeight.val(monitorDriverConfig.DLP_Y_Res);
    updateScreenSettings();
    if (convert) {
        $('#screen-diagonal-unit-in').prop('checked', false);
        $('#screen-diagonal-unit-mm').prop('checked', true);
        updateScreenSettings();        
    }

    // No error occurred so return false
    return false;
}

// Initialize values
function initializeValues() {
    makeButton();

    // settings.set('#slicer.panel.collapsed', true);
    // $slicerBody.collapse('hide');

    let XYerr = false;
    $.get( '/services/printers/getFirstAvailablePrinter', function( data ) {
        if (data !== null && data !== undefined) {
            XYerr = setPrinterCalibrationSettings(data);
        }
    }).fail(function (data) {
        alert('Error: '+ data.responseText);
    });

    if (XYerr) {
        // Error handling
        alert('Your DotsPermmX and DotsPermmY are more than 0.1 mm apart');
    }

}

function makeZip() {
    $('#uploadzip-icon').prop('class', 'glyphicon glyphicon-refresh glyphicon-spin');
    if (zipFile === null || zipFile === undefined) {
        alert('You must first slice images to generate a zip file.');
    } else {
        let name = 'SLAcer';
        if (loadedFile && loadedFile.name) {
            name = loadedFile.name;
        }
        uploadZip(zipFile.generate({type: 'blob'}), name + '.zip');
    }
}

function uploadZip(zipFile, fileName) {
    let blob = zipFile;
    let form = new FormData();
    form.append('file',blob,fileName);
    let request = new XMLHttpRequest();
    request.open('POST', '/services/printables/uploadPrintableFile');
    // When the request is successfully sent, alert the user
    request.onreadystatechange = () => {
        if (request.readyState == 4 && request.status == 200) {
            // window.open('/printablesPage', '_self');
            $('#uploadzip-icon').prop('class', 'glyphicon glyphicon-upload');
            alert('Upload successful! Refresh printables page on Photonic3D to see the file.');
        }
    };
    request.send(form);
}

function makeButton() {
    //rename original zip button
    let btn    = document.getElementById('zip-button');
    btn.innerHTML = '<span class="glyphicon glyphicon-compressed"></span> ZIP';
    
    //create new zip button
    let newbtn = document.createElement('BUTTON');
    $(newbtn).css({
        'margin-top' : '10px'
    });    
    btn.parentNode.insertBefore(newbtn, btn.nextSibling);
    newbtn.onclick = () => {
        makeZip();
    };
    newbtn.id = 'new-zip-button';
    newbtn.className = 'btn btn-primary';
    newbtn.disabled = true;
    newbtn.innerHTML = '<i class="glyphicon glyphicon-upload" id="uploadzip-icon"></i> Upload ZIP To Photonic3D';
}

let oldEndSlicing = endSlicing;

endSlicing = function() {
    oldEndSlicing();
    $('#new-zip-button').prop('disabled', !zipFile);
};

$(document).ready(initializeValues);

