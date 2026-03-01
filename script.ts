import "./src/automata.js";

// const rfall = {
//     type: "spatial",
//     before: `@ B
//              A B`,
//     after: `B B
//             A @`,
//     scope: {
//         "@": "sand",
//         A: "sand",
//     },
// };

// const lfall = {
//     type: "spatial",
//     before: `B @
//              B A`,
//     after: `B B
//             @ A`,
//     scope: {
//         "@": "sand",
//         A: "sand",
//     },
// };

// const dfall = {
//     type: "spatial",
//     before: `@
//              B`,
//     after: `B
//             @`,
//     scope: {
//         "@": "sand",
//     },
// };

// const rule = {
//     type: "sequential",
//     sequence: [
//         dfall,
//         {
//             type: "quantum",
//             rules: [rfall, lfall],
//         },
//     ],
// };
