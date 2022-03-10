const path = require('path');
const webpack = require('webpack')

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
            // babelのため
            process: require.resolve('process/browser'),
            Buffer: require.resolve('buffer'),
        },
    },
    mode: 'development',
    devtool: 'source-map',
    // babelのため
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: 'buffer',
        }),
    ],
};
