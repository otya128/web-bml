const path = require('path');

module.exports = {
    entry: './web/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'arib.js',
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
            },
        ],
    },
    resolve: {
        extensions: [
            '.ts', '.js',
        ],
        fallback: {
            fs: false,
            path: false,
            url: false,
        }
    },
    mode: 'production',
    devtool: 'source-map',
};
