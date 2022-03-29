const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    entry: {
        main: './src/index.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: 'web-bml',
        libraryTarget: 'umd',
        globalObject: 'this',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
            },
            {
                test: /default\.css$/,
                type: 'asset/source',
            }
        ],
    },
    resolve: {
        extensions: [
            '.ts', '.js', '.tsx'
        ],
        fallback: {
            path: false,
            url: false,
            vm: false,
            fs: false,
            Buffer: require.resolve('buffer'),
        },
    },
    devtool: 'inline-source-map',
    externals: [nodeExternals()],
};

if (process.env.NODE_ENV == null) {
    module.exports.mode = "development";
}
