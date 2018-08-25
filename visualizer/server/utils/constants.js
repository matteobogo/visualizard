const constants = {

    IMAGE_EXTENSIONS: {
        IMAGE_PNG_EXT: 'png',
        IMAGE_JPEG_EXT: 'jpeg',
        IMAGE_PDF_EXT: 'pdf',
    },

    PATH_HEATMAPS_IMAGES: './public/images',

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
            SORT_BY_MACHINE: 'SORT_BY_MACHINE',
            SORT_BY_SUM: 'SORT_BY_SUM',
            SORT_BY_TS_OF_MAX_VALUE: 'SORT_BY_TS_OF_MAX_VALUE',
        },
        MODES: {
            SINGLE_IMAGE: 'SINGLE_IMAGE',
            TILES: 'TILES',
        },
    },

    ANALYSIS: {
        TYPES: {
            DATASET: 'Dataset Analysis',
            MEASUREMENTS: 'Measurements Analysis',
            POINTS_PER_TIMESTAMP: 'Points per Timestamp Analysis',
        },
    },

    COMPUTATION_PERCENTAGES_INIT: '0',
    COMPUTATION_PERCENTAGES: ['10','20','30','40','50','60','70','80','90','100']
};

module.exports = Object.freeze(constants);