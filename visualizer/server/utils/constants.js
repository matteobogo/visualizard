const constants = {

    IMAGE_EXTENSIONS: {
        IMAGE_PNG_EXT: Symbol('png'),
        IMAGE_JPEG_EXT: Symbol('jpeg'),
        IMAGE_PDF_EXT: Symbol('pdf'),
    },

    PATH_HEATMAPS_IMAGES: Symbol('./public/images'),

    PALETTES: {
        GRAY: {
            RGB_SCALE: [
                {r:61 , g:61 , b:61},
                {r:71 , g:71 , b:71 },
                {r:81 , g:81 , b:81 },
                {r:91 , g:91 , b:91 },
                {r:102 , g:102 , b:102 },
                {r:117 , g:117 , b:117 },
                {r:132 , g:132 , b:132 },
                {r:147 , g:147 , b:147 },
                {r:163 , g:163 , b:163 },
                {r:178 , g:178 , b:178 }
            ],
        },
        RED: {
            RGB_SCALE: [
                {r:255 , g:102 , b:102 },
                {r:255 , g:76 , b:76 },
                {r:255 , g:50 , b:50 },
                {r:255 , g:25 , b:25 },
                {r:255 , g:0 , b:0 },
                {r:229 , g:0 , b:0 },
                {r:204 , g:0 , b:0 },
                {r:178 , g:0 , b:0 },
                {r:153 , g:0 , b:0 },
                {r:127 , g:0 , b:0 }
            ],
        },
    },

    HEATMAPS: {
        TYPES: {
            BY_MACHINE: Symbol('sort by machine'),
            BY_SUM: Symbol('sort by sum'),
            BY_TS_OF_MAX_VALUE: Symbol('sort by ts of max value'),
        },
    },
};

exports.constants = Object.freeze(constants);