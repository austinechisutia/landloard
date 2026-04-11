const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/tenantsController');

router.use(auth);
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/',   ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
