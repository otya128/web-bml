const path = require('path');

module.exports = {
    entry: {
        main: './src/decode_ts.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: 'web-bml-ts',
        libraryTarget: 'umd',
        globalObject: 'this',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
            }
        ],
    },
    resolve: {
        extensions: [
            '.ts', '.js', '.tsx'
        ],
        fallback: {
        },
    },
    devtool: 'inline-source-map',
    target: 'node',
    externalsPresets: {
        node: true
    },
};

if (process.env.NODE_ENV == null) {
    module.exports.mode = "development";
}
