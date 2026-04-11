const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/houseTypesController');

router.use(auth);
router.get('/',       ctrl.getAll);
router.post('/',      ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
